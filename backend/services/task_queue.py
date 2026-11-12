"""Serial generation queue — ensures only one TTS inference runs at a time

to avoid GPU contention, with bounded capacity, explicit task states,
duplicate job deduplication, and graceful shutdown.
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
import time
import traceback
from dataclasses import dataclass, field
from enum import Enum
from typing import Coroutine, Literal, Optional

logger = logging.getLogger(__name__)

# Default bounded capacity for queued generation requests
DEFAULT_MAX_QUEUE_CAPACITY = 100

# Keep references to fire-and-forget background tasks to prevent GC
_background_tasks: set[asyncio.Task] = set()


class TaskState(str, Enum):
    """Explicit, consistent generation task states."""

    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


VALID_TRANSITIONS: dict[TaskState, set[TaskState]] = {
    TaskState.QUEUED: {TaskState.RUNNING, TaskState.CANCELLED, TaskState.FAILED},
    TaskState.RUNNING: {TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELLED},
    TaskState.COMPLETED: set(),
    TaskState.FAILED: set(),
    TaskState.CANCELLED: set(),
}


@dataclass
class GenerationJob:
    """Queued generation work plus the generation ID and metadata."""

    generation_id: str
    coro: Coroutine
    fingerprint: Optional[str] = None
    created_at: float = field(default_factory=time.time)


@dataclass
class JobRecord:
    """In-memory tracking record for a generation task."""

    generation_id: str
    state: TaskState
    fingerprint: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    error: Optional[str] = None
    task: Optional[asyncio.Task] = None


# Module-level state
_generation_queue: asyncio.Queue[GenerationJob] = None  # type: ignore
_generation_worker_task: asyncio.Task | None = None
_job_records: dict[str, JobRecord] = {}
_accepting_jobs: bool = True
_max_queue_capacity: int = int(os.environ.get("RHEO_MAX_QUEUE_CAPACITY", str(DEFAULT_MAX_QUEUE_CAPACITY)))

# Backward compatibility sets and dicts
_queued_generation_ids: set[str] = set()
_running_generation_tasks: dict[str, asyncio.Task] = {}
_cancelled_generation_ids: set[str] = set()


def create_background_task(coro) -> asyncio.Task:
    """Create a background task and prevent it from being garbage collected."""
    task = asyncio.create_task(coro)
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    return task


def get_queue_size() -> int:
    """Return the number of jobs currently waiting in the queue."""
    if _generation_queue is None:
        return 0
    return _generation_queue.qsize()


def is_queue_full() -> bool:
    """Return True if the queue is at or above capacity."""
    return get_queue_size() >= _max_queue_capacity


def get_task_state(generation_id: str) -> Optional[TaskState]:
    """Get the current state of a task by generation ID."""
    record = _job_records.get(generation_id)
    return record.state if record else None


def transition_task_state(
    generation_id: str,
    target_state: TaskState,
    error: Optional[str] = None,
) -> bool:
    """Validate and transition a task to a new state.

    Rejects invalid state transitions (e.g. from terminal states).
    """
    record = _job_records.get(generation_id)
    if record is None:
        # Create record if transitioning to initial state
        if target_state == TaskState.QUEUED:
            _job_records[generation_id] = JobRecord(
                generation_id=generation_id,
                state=TaskState.QUEUED,
                error=error,
            )
            return True
        return False

    current_state = record.state
    if target_state == current_state:
        return True

    allowed = VALID_TRANSITIONS.get(current_state, set())
    if target_state not in allowed:
        logger.warning(
            "Rejected invalid state transition for generation %s: %s -> %s",
            generation_id,
            current_state.value,
            target_state.value,
        )
        raise ValueError(
            f"Invalid state transition for generation {generation_id}: {current_state.value} -> {target_state.value}"
        )

    record.state = target_state
    if error is not None:
        record.error = error

    if target_state in (TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELLED):
        record.completed_at = time.time()

    return True


def get_active_job_by_fingerprint(
    fingerprint: str,
    max_age_seconds: float = 10.0,
) -> Optional[JobRecord]:
    """Find an active (QUEUED or RUNNING) job matching the given fingerprint."""
    if not fingerprint:
        return None

    now = time.time()
    for record in _job_records.values():
        if record.fingerprint == fingerprint:
            if record.state in (TaskState.QUEUED, TaskState.RUNNING):
                if now - record.created_at <= max_age_seconds:
                    return record
    return None


async def _generation_worker():
    """Worker that processes generation tasks one at a time."""
    while True:
        try:
            job = await _generation_queue.get()
        except asyncio.CancelledError:
            break

        generation_id = job.generation_id
        record = _job_records.get(generation_id)

        try:
            # Check if job was cancelled while waiting in the queue
            if generation_id in _cancelled_generation_ids or (record and record.state == TaskState.CANCELLED):
                _cancelled_generation_ids.discard(generation_id)
                _queued_generation_ids.discard(generation_id)
                job.coro.close()
                await _update_cancelled_in_db(generation_id)
                continue

            # Check if state transition to RUNNING is valid
            try:
                transition_task_state(generation_id, TaskState.RUNNING)
            except ValueError:
                job.coro.close()
                continue

            task = asyncio.create_task(job.coro)
            _running_generation_tasks[generation_id] = task
            _queued_generation_ids.discard(generation_id)
            if record:
                record.task = task
                record.started_at = time.time()

            try:
                await task
                transition_task_state(generation_id, TaskState.COMPLETED)
            except asyncio.CancelledError:
                transition_task_state(generation_id, TaskState.CANCELLED, error="Generation cancelled")
                await _update_cancelled_in_db(generation_id)
                if not task.cancelled():
                    raise
            except Exception as exc:
                logger.exception("Generation task %s raised unhandled exception: %s", generation_id, exc)
                transition_task_state(generation_id, TaskState.FAILED, error=str(exc))
                await _force_fail_if_active(generation_id, f"Worker error: {exc}")

        except Exception as outer_exc:
            logger.exception("Unexpected error in generation worker loop: %s", outer_exc)
            await _force_fail_if_active(
                job.generation_id,
                "Worker exited without writing terminal status",
            )
        finally:
            _running_generation_tasks.pop(generation_id, None)
            _queued_generation_ids.discard(generation_id)
            if record:
                record.task = None
            _generation_queue.task_done()


async def _update_cancelled_in_db(generation_id: str) -> None:
    """Ensure database state reflects cancellation."""
    try:
        from ..database import session as session_mod
        if getattr(session_mod, "SessionLocal", None) is None:
            return
        from ..database import Generation as DBGeneration
        from . import history

        for db in session_mod.get_db():
            gen = db.query(DBGeneration).filter_by(id=generation_id).first()
            if gen and (gen.status or "completed") in ("generating", "loading_model", "queued"):
                await history.update_generation_status(
                    generation_id=generation_id,
                    status="cancelled",
                    db=db,
                    error="Generation cancelled",
                )
            break
    except Exception as exc:
        logger.warning("Could not mark generation %s as cancelled in DB: %s", generation_id, exc)


async def _force_fail_if_active(generation_id: str, error: str) -> None:
    """Best-effort recovery — flip an active row to failed if the worker
    bailed before writing a terminal status. Catches the case where the gen
    coroutine's own status-write raised (e.g. SQLite lock contention).
    """
    try:
        from ..database import session as session_mod
        if getattr(session_mod, "SessionLocal", None) is None:
            return
        from ..database import Generation as DBGeneration
        from . import history

        for db in session_mod.get_db():
            gen = db.query(DBGeneration).filter_by(id=generation_id).first()
            if gen is None:
                return
            if (gen.status or "completed") not in ("loading_model", "generating", "queued"):
                return
            await history.update_generation_status(
                generation_id=generation_id,
                status="failed",
                db=db,
                error=error,
            )
            break
    except Exception:
        traceback.print_exc()


def enqueue_generation(
    generation_id: str,
    coro: Coroutine,
    fingerprint: Optional[str] = None,
) -> None:
    """Add a generation coroutine to the bounded serial queue.

    Raises:
        RuntimeError: If queue is uninitialized or shutting down.
        ValueError: If queue capacity is exceeded.
    """
    if _generation_queue is None:
        raise RuntimeError("Generation queue has not been initialized")

    if not _accepting_jobs:
        raise RuntimeError("Server is shutting down; not accepting new generation requests")

    if is_queue_full():
        raise ValueError(
            f"Generation queue capacity exceeded (maximum {_max_queue_capacity} queued jobs). Please try again later."
        )

    # Initialize job tracking record
    _job_records[generation_id] = JobRecord(
        generation_id=generation_id,
        state=TaskState.QUEUED,
        fingerprint=fingerprint,
        created_at=time.time(),
    )

    _queued_generation_ids.add(generation_id)
    _generation_queue.put_nowait(
        GenerationJob(
            generation_id=generation_id,
            coro=coro,
            fingerprint=fingerprint,
        )
    )


def cancel_generation(generation_id: str) -> Literal["queued", "running"] | None:
    """Cancel a queued or running generation if it is still active."""
    record = _job_records.get(generation_id)

    # 1. Check running task
    running_task = _running_generation_tasks.get(generation_id)
    if running_task is not None:
        if record:
            try:
                transition_task_state(generation_id, TaskState.CANCELLED, error="Generation cancelled")
            except ValueError:
                pass
        running_task.cancel()
        return "running"

    # 2. Check queued task
    if generation_id in _queued_generation_ids or (record and record.state == TaskState.QUEUED):
        _queued_generation_ids.discard(generation_id)
        _cancelled_generation_ids.add(generation_id)
        if record:
            try:
                transition_task_state(generation_id, TaskState.CANCELLED, error="Generation cancelled")
            except ValueError:
                pass
        return "queued"

    return None


async def cancel_generation_and_await(
    generation_id: str,
    timeout: float = 3.0,
) -> Literal["queued", "running"] | None:
    """Cancel a queued or running generation and wait for resources to be released."""
    running_task = _running_generation_tasks.get(generation_id)
    state = cancel_generation(generation_id)
    if state == "running" and running_task is not None:
        try:
            await asyncio.wait_for(running_task, timeout=timeout)
        except (asyncio.CancelledError, asyncio.TimeoutError, Exception):
            pass
    elif state == "queued":
        await _update_cancelled_in_db(generation_id)
    return state


async def shutdown_queue(grace_period: float = 5.0) -> None:
    """Gracefully shutdown the generation queue.

    1. Stops accepting new jobs.
    2. Drains and cancels pending queued jobs before execution.
    3. Gives the currently active job up to `grace_period` seconds to finish.
    4. Cancels and awaits active task if it exceeds the grace period.
    5. Awaits worker termination.
    6. Releases device memory caches.
    """
    global _accepting_jobs, _generation_worker_task
    logger.info("Initiating graceful shutdown of generation queue...")
    _accepting_jobs = False

    # 1. Drain and cancel queued jobs
    if _generation_queue is not None:
        while not _generation_queue.empty():
            try:
                job = _generation_queue.get_nowait()
                job.coro.close()
                _queued_generation_ids.discard(job.generation_id)
                transition_task_state(
                    job.generation_id,
                    TaskState.CANCELLED,
                    error="Server shut down before generation started",
                )
                await _update_cancelled_in_db(job.generation_id)
                _generation_queue.task_done()
            except (asyncio.QueueEmpty, ValueError):
                break

    # 2. Check running task
    for gen_id, task in list(_running_generation_tasks.items()):
        logger.info(
            "Waiting up to %.1fs for active generation %s to complete...",
            grace_period,
            gen_id,
        )
        try:
            await asyncio.wait_for(task, timeout=grace_period)
        except asyncio.TimeoutError:
            logger.warning(
                "Active generation %s exceeded grace period (%.1fs); cancelling...",
                gen_id,
                grace_period,
            )
            task.cancel()
            try:
                await asyncio.wait_for(task, timeout=2.0)
            except (asyncio.CancelledError, asyncio.TimeoutError, Exception):
                pass
            transition_task_state(
                gen_id,
                TaskState.CANCELLED,
                error="Server shut down during generation",
            )
            await _force_fail_if_active(gen_id, "Server shut down during generation")
        except (asyncio.CancelledError, Exception):
            pass

    # 3. Stop the worker task
    if _generation_worker_task and not _generation_worker_task.done():
        _generation_worker_task.cancel()
        try:
            await asyncio.wait_for(_generation_worker_task, timeout=2.0)
        except (asyncio.CancelledError, asyncio.TimeoutError, Exception):
            pass

    _generation_worker_task = None
    _running_generation_tasks.clear()
    _queued_generation_ids.clear()
    _cancelled_generation_ids.clear()

    # 4. Clean GPU and device memory (only if torch was actually loaded)
    try:
        if "torch" in sys.modules:
            from ..backends.base import empty_device_cache
            from ..utils.platform_detect import get_torch_device

            empty_device_cache(get_torch_device())
    except Exception:
        pass

    logger.info("Generation queue shutdown complete")


def init_queue(force: bool = False, max_capacity: Optional[int] = None):
    """Initialize the generation queue and start the worker.

    Must be called once during application startup (inside a running event loop).
    """
    global _generation_queue, _generation_worker_task
    global _queued_generation_ids, _running_generation_tasks, _cancelled_generation_ids
    global _job_records, _accepting_jobs, _max_queue_capacity

    if max_capacity is not None:
        _max_queue_capacity = max_capacity
    else:
        _max_queue_capacity = int(os.environ.get("RHEO_MAX_QUEUE_CAPACITY", str(DEFAULT_MAX_QUEUE_CAPACITY)))

    if _generation_worker_task is not None and not _generation_worker_task.done():
        if not force:
            return
        _generation_worker_task.cancel()
        for task in list(_running_generation_tasks.values()):
            task.cancel()

    _generation_queue = asyncio.Queue()
    _queued_generation_ids = set()
    _running_generation_tasks = {}
    _cancelled_generation_ids = set()
    _job_records = {}
    _accepting_jobs = True
    _generation_worker_task = create_background_task(_generation_worker())
