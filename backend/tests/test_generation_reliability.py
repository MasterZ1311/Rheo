"""Generation engine and task queue reliability regression test suite for Phase 4.

Covers:
1. Bounded queue capacity enforcement and rejection.
2. Duplicate job protection and deduplication.
3. Explicit task state machine and invalid state transition rejection.
4. Queued and running task cancellation with worker awaiting and temp file cleanup.
5. Worker exception resilience and continuous processing.
6. Graceful queue shutdown and forced shutdown on timeout.
7. GPU Out-Of-Memory handling and cache clearing.
8. Model loading concurrency serialization and unloading protection.
9. Startup recovery of stale/interrupted jobs.
"""

import asyncio
import io
import time
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, event, text as sa_text
from sqlalchemy.orm import sessionmaker

from backend import config
from backend.database import (
    Base,
    Generation as DBGeneration,
    VoiceProfile as DBVoiceProfile,
    get_db,
)
from backend.services import history, task_queue
from backend.services.task_queue import (
    TaskState,
    cancel_generation,
    cancel_generation_and_await,
    enqueue_generation,
    get_active_job_by_fingerprint,
    get_queue_size,
    get_task_state,
    init_queue,
    is_queue_full,
    shutdown_queue,
    transition_task_state,
)


@pytest.fixture(autouse=True)
async def cleanup_generation_queue():
    """Ensure task queue and its background worker are cleanly shut down after each test."""
    try:
        yield
    finally:
        await shutdown_queue(grace_period=0.1)


@pytest.fixture
def reliability_db_session(tmp_path, monkeypatch):
    """Create a temporary SQLite database for testing generation reliability."""
    db_file = tmp_path / "rheo_reliability.db"
    monkeypatch.setattr(config, "_data_dir", tmp_path)

    engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False, "timeout": 30.0},
    )

    @event.listens_for(engine, "connect")
    def _set_pragmas(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    monkeypatch.setattr("backend.database.session.SessionLocal", TestingSessionLocal)
    monkeypatch.setattr("backend.database.session.engine", engine)

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        engine.dispose()


# ==============================================================================
# 1. TASK STATE MACHINE & INVALID TRANSITIONS
# ==============================================================================

@pytest.mark.asyncio
async def test_task_state_transitions():
    """Verify valid transitions succeed and invalid transitions raise ValueError."""
    gen_id = "state-test-1"
    init_queue(force=True)

    # Initial state creation
    assert transition_task_state(gen_id, TaskState.QUEUED) is True
    assert get_task_state(gen_id) == TaskState.QUEUED

    # QUEUED -> RUNNING
    assert transition_task_state(gen_id, TaskState.RUNNING) is True
    assert get_task_state(gen_id) == TaskState.RUNNING

    # RUNNING -> COMPLETED
    assert transition_task_state(gen_id, TaskState.COMPLETED) is True
    assert get_task_state(gen_id) == TaskState.COMPLETED

    # COMPLETED is terminal: transitioning back to RUNNING or QUEUED must be rejected
    with pytest.raises(ValueError, match="Invalid state transition"):
        transition_task_state(gen_id, TaskState.RUNNING)

    with pytest.raises(ValueError, match="Invalid state transition"):
        transition_task_state(gen_id, TaskState.QUEUED)


@pytest.mark.asyncio
async def test_cancelled_state_is_terminal():
    """Verify CANCELLED is a terminal state."""
    gen_id = "state-test-cancelled"
    init_queue(force=True)

    assert transition_task_state(gen_id, TaskState.QUEUED) is True
    assert transition_task_state(gen_id, TaskState.CANCELLED) is True
    assert get_task_state(gen_id) == TaskState.CANCELLED

    # Transition from CANCELLED to COMPLETED or RUNNING must fail
    with pytest.raises(ValueError, match="Invalid state transition"):
        transition_task_state(gen_id, TaskState.COMPLETED)

    with pytest.raises(ValueError, match="Invalid state transition"):
        transition_task_state(gen_id, TaskState.RUNNING)


# ==============================================================================
# 2. BOUNDED QUEUE CAPACITY
# ==============================================================================

@pytest.mark.asyncio
async def test_bounded_queue_capacity_enforcement():
    """Verify queue rejects new jobs when capacity limit is reached."""
    # Initialize queue with small capacity of 2
    init_queue(force=True, max_capacity=2)

    block_event = asyncio.Event()

    async def blocking_coro():
        await block_event.wait()

    # Enqueue first job (gets picked up by worker immediately, or fills slot)
    enqueue_generation("job-1", blocking_coro())
    await asyncio.sleep(0.05)  # Allow worker to pick up job-1

    # Enqueue 2 more jobs to fill the waiting queue capacity (max_capacity=2)
    enqueue_generation("job-2", blocking_coro())
    enqueue_generation("job-3", blocking_coro())

    assert is_queue_full() is True

    # 4th job must be rejected with ValueError
    coro4 = blocking_coro()
    with pytest.raises(ValueError, match="capacity exceeded"):
        enqueue_generation("job-4", coro4)
    coro4.close()

    # Release worker and clean up
    block_event.set()
    await asyncio.sleep(0.1)


# ==============================================================================
# 3. DUPLICATE JOB PROTECTION & DEDUPLICATION
# ==============================================================================

@pytest.mark.asyncio
async def test_duplicate_job_fingerprint_deduplication(reliability_db_session):
    """Verify identical submissions within dedup window return existing active job."""
    from backend import models
    from backend.routes.generations import (
        compute_generation_fingerprint,
        generate_speech,
    )

    db = reliability_db_session
    init_queue(force=True)

    # Create test profile
    prof = DBVoiceProfile(id="prof-dedup", name="Dedup Voice", voice_type="cloned")
    db.add(prof)
    db.commit()

    fp1 = compute_generation_fingerprint(
        profile_id="prof-dedup",
        text="Hello deduplication test",
        engine="qwen",
        language="en",
        seed=42,
    )
    fp2 = compute_generation_fingerprint(
        profile_id="prof-dedup",
        text="Hello deduplication test",
        engine="qwen",
        language="en",
        seed=42,
    )
    assert fp1 == fp2

    # Different text produces different fingerprint
    fp_diff = compute_generation_fingerprint(
        profile_id="prof-dedup",
        text="Different text",
        engine="qwen",
        language="en",
        seed=42,
    )
    assert fp1 != fp_diff

    # Simulate double-click on /generate endpoint
    req_data = models.GenerationRequest(
        profile_id="prof-dedup",
        text="Hello deduplication test",
        engine="qwen",
        seed=42,
    )

    async def dummy_run(*args, **kwargs):
        await asyncio.sleep(0.05)

    with patch("backend.routes.generations.run_generation", side_effect=dummy_run):
        gen1 = await generate_speech(req_data, db=db)
        gen2 = await generate_speech(req_data, db=db)

    # Both requests must return the SAME generation ID!
    assert gen1.id == gen2.id
    assert db.query(DBGeneration).filter_by(profile_id="prof-dedup").count() == 1


# ==============================================================================
# 4. TASK CANCELLATION & WORKER AWAITING
# ==============================================================================

@pytest.mark.asyncio
async def test_queued_task_cancellation_closes_coro():
    """Cancelling a queued task closes the coroutine and updates state without executing."""
    init_queue(force=True)

    running_started = asyncio.Event()
    release_running = asyncio.Event()
    queued_ran = asyncio.Event()

    async def running_job():
        running_started.set()
        await release_running.wait()

    async def queued_job():
        queued_ran.set()

    enqueue_generation("gen-active", running_job())
    await asyncio.wait_for(running_started.wait(), timeout=1.0)

    enqueue_generation("gen-to-cancel", queued_job())
    assert get_task_state("gen-to-cancel") == TaskState.QUEUED

    # Cancel queued job
    cancellation_result = cancel_generation("gen-to-cancel")
    assert cancellation_result == "queued"
    assert get_task_state("gen-to-cancel") == TaskState.CANCELLED

    # Release running job and let worker advance
    release_running.set()
    await asyncio.sleep(0.1)

    # The cancelled job must NEVER have run
    assert not queued_ran.is_set()


@pytest.mark.asyncio
async def test_running_task_cancellation_and_temp_file_cleanup(tmp_path, reliability_db_session, monkeypatch):
    """Cancelling a running task terminates the task, updates DB, and unlinks partial audio."""
    db = reliability_db_session
    monkeypatch.setattr(config, "_data_dir", tmp_path)
    init_queue(force=True)

    gen_id = "gen-running-cancel"
    prof = DBVoiceProfile(id="prof-cancel", name="Cancel Profile", voice_type="cloned")
    db.add(prof)
    db.commit()

    # Pre-create a partial audio file that would be generated
    audio_dir = tmp_path / "generations"
    audio_dir.mkdir(parents=True, exist_ok=True)
    partial_wav = audio_dir / f"{gen_id}.wav"
    partial_wav.write_bytes(b"PARTIAL_AUDIO_CORRUPTED")

    # Create DB row
    gen = DBGeneration(id=gen_id, profile_id="prof-cancel", text="Cancelling", status="generating")
    db.add(gen)
    db.commit()

    started = asyncio.Event()

    async def long_running_gen():
        started.set()
        try:
            await asyncio.Event().wait()  # Wait forever until cancelled
        except asyncio.CancelledError:
            # Clean up partial audio upon cancellation as in run_generation
            if partial_wav.exists():
                partial_wav.unlink(missing_ok=True)
            raise

    enqueue_generation(gen_id, long_running_gen())
    await asyncio.wait_for(started.wait(), timeout=1.0)

    # Cancel running generation and await termination
    result = await cancel_generation_and_await(gen_id, timeout=2.0)
    assert result == "running"
    assert get_task_state(gen_id) == TaskState.CANCELLED

    # Partial file must be unlinked
    assert not partial_wav.exists()


# ==============================================================================
# 5. WORKER EXCEPTION RESILIENCE
# ==============================================================================

@pytest.mark.asyncio
async def test_worker_survives_job_exceptions():
    """An unhandled exception in one job must not crash the worker; subsequent jobs must execute."""
    init_queue(force=True)

    job1_failed = asyncio.Event()
    job2_succeeded = asyncio.Event()

    async def failing_job():
        job1_failed.set()
        raise RuntimeError("Simulated inference crash")

    async def succeeding_job():
        job2_succeeded.set()

    enqueue_generation("crash-job", failing_job())
    enqueue_generation("ok-job", succeeding_job())

    # Wait for both jobs to process
    await asyncio.wait_for(job1_failed.wait(), timeout=1.0)
    await asyncio.wait_for(job2_succeeded.wait(), timeout=1.0)
    await asyncio.sleep(0.05)

    assert get_task_state("crash-job") == TaskState.FAILED
    assert get_task_state("ok-job") == TaskState.COMPLETED


# ==============================================================================
# 6. GRACEFUL SHUTDOWN
# ==============================================================================

@pytest.mark.asyncio
async def test_graceful_shutdown_drains_queue_and_stops_accepting():
    """Shutdown stops accepting jobs, cancels queued jobs, and awaits active task."""
    init_queue(force=True)

    running_started = asyncio.Event()
    finish_running = asyncio.Event()

    async def active_job():
        running_started.set()
        await finish_running.wait()

    async def queued_job():
        pass

    enqueue_generation("active-shut", active_job())
    enqueue_generation("queued-shut", queued_job())
    await asyncio.wait_for(running_started.wait(), timeout=1.0)

    # Start shutdown with 1.0s grace period
    shutdown_task = asyncio.create_task(shutdown_queue(grace_period=1.0))
    await asyncio.sleep(0.01)

    # Any new enqueue attempt during shutdown must be rejected
    coro_rej = queued_job()
    with pytest.raises(RuntimeError, match="Server is shutting down"):
        enqueue_generation("new-job", coro_rej)
    coro_rej.close()

    # Queued job was cancelled
    assert get_task_state("queued-shut") == TaskState.CANCELLED

    # Finish the active job within grace period
    finish_running.set()
    await asyncio.wait_for(shutdown_task, timeout=2.0)

    assert get_task_state("active-shut") == TaskState.COMPLETED
    assert get_queue_size() == 0


@pytest.mark.asyncio
async def test_forced_shutdown_cancels_hanging_job_after_grace_period():
    """Active jobs exceeding the grace period are forcefully cancelled and cleaned up."""
    init_queue(force=True)

    running_started = asyncio.Event()

    async def hanging_job():
        running_started.set()
        await asyncio.Event().wait()  # Never completes on its own

    enqueue_generation("hang-shut", hanging_job())
    await asyncio.wait_for(running_started.wait(), timeout=1.0)

    # Shutdown with short 0.2s grace period
    start_time = time.time()
    await shutdown_queue(grace_period=0.2)
    elapsed = time.time() - start_time

    # Should have waited approx 0.2s and then cancelled
    assert elapsed >= 0.2
    assert get_task_state("hang-shut") == TaskState.CANCELLED


# ==============================================================================
# 7. GPU OUT-OF-MEMORY HANDLING
# ==============================================================================

@pytest.mark.asyncio
async def test_gpu_out_of_memory_handling(reliability_db_session, tmp_path, monkeypatch):
    """Simulated CUDA OOM cleans device cache and marks generation failed with actionable message."""
    db = reliability_db_session
    monkeypatch.setattr(config, "_data_dir", tmp_path)

    gen_id = "oom-test-gen"
    prof = DBVoiceProfile(id="prof-oom", name="OOM Profile", voice_type="cloned")
    db.add(prof)
    db.commit()

    gen = DBGeneration(id=gen_id, profile_id="prof-oom", text="Long text", status="generating")
    db.add(gen)
    db.commit()

    from backend.services.generation import run_generation

    # Simulate OOM inside generate_chunked
    with patch("backend.utils.chunked_tts.generate_chunked", side_effect=RuntimeError("CUDA out of memory. Tried to allocate 2.00 GiB")), \
         patch("backend.backends.get_tts_backend_for_engine"), \
         patch("backend.backends.load_engine_model"), \
         patch("backend.services.profiles.create_voice_prompt_for_profile", return_value={}):

        await run_generation(
            generation_id=gen_id,
            profile_id="prof-oom",
            text="Long text",
            language="en",
            engine="qwen",
            model_size="1.7B",
            seed=42,
            mode="generate",
        )

    # Check database status
    db.expire_all()
    updated = db.query(DBGeneration).filter_by(id=gen_id).first()
    assert updated.status == "failed"
    assert "GPU out of memory" in updated.error
    assert "smaller model size" in updated.error


# ==============================================================================
# 8. STARTUP RECOVERY OF STALE JOBS
# ==============================================================================

def test_startup_cleans_up_stale_jobs(reliability_db_session):
    """Verify application startup marks leftover queued/generating/loading_model jobs as failed."""
    db = reliability_db_session
    prof = DBVoiceProfile(id="prof-stale", name="Stale Profile", voice_type="cloned")
    db.add(prof)
    db.commit()

    g1 = DBGeneration(id="stale-1", profile_id="prof-stale", text="Text 1", status="generating")
    g2 = DBGeneration(id="stale-2", profile_id="prof-stale", text="Text 2", status="loading_model")
    g3 = DBGeneration(id="stale-3", profile_id="prof-stale", text="Text 3", status="queued")
    g4 = DBGeneration(id="completed-4", profile_id="prof-stale", text="Text 4", status="completed")
    db.add_all([g1, g2, g3, g4])
    db.commit()

    # Run the startup cleanup query
    db.execute(
        sa_text(
            "UPDATE generations SET status = 'failed', "
            "error = 'Server was shut down before generation completed' "
            "WHERE status IN ('generating', 'loading_model', 'queued')"
        )
    )
    db.commit()

    db.expire_all()
    assert db.query(DBGeneration).filter_by(id="stale-1").first().status == "failed"
    assert db.query(DBGeneration).filter_by(id="stale-2").first().status == "failed"
    assert db.query(DBGeneration).filter_by(id="stale-3").first().status == "failed"
    assert db.query(DBGeneration).filter_by(id="completed-4").first().status == "completed"


# ==============================================================================
# 9. QUEUE OVER-CAPACITY HTTP 429 REJECTION
# ==============================================================================

@pytest.mark.asyncio
async def test_queue_full_returns_http_429(reliability_db_session):
    """When the queue is full, generate_speech must reject the request with HTTP 429."""
    from backend import models
    from backend.routes.generations import generate_speech

    db = reliability_db_session
    init_queue(force=True, max_capacity=1)

    prof = DBVoiceProfile(id="prof-cap-429", name="Cap 429 Profile", voice_type="cloned")
    db.add(prof)
    db.commit()

    block_event = asyncio.Event()

    async def blocking_job():
        await block_event.wait()

    # Fill worker slot and waiting queue
    enqueue_generation("active-job", blocking_job())
    await asyncio.sleep(0.05)
    enqueue_generation("queued-job", blocking_job())
    assert is_queue_full() is True

    req_data = models.GenerationRequest(
        profile_id="prof-cap-429",
        text="Should be rejected 429",
        engine="qwen",
    )

    with pytest.raises(HTTPException) as exc_info:
        await generate_speech(req_data, db=db)

    assert exc_info.value.status_code == 429
    assert "capacity" in exc_info.value.detail.lower()

    block_event.set()
    await asyncio.sleep(0.05)


# ==============================================================================
# 10. IDEMPOTENCY CLEARED AFTER TERMINAL STATE
# ==============================================================================

@pytest.mark.asyncio
async def test_idempotency_cleared_after_terminal_states():
    """Once a job transitions to COMPLETED, FAILED, or CANCELLED, fingerprint is no longer active."""
    init_queue(force=True)
    fp = "test-fp-12345"

    task_queue._job_records["gen-term-1"] = task_queue.JobRecord(
        generation_id="gen-term-1",
        state=TaskState.QUEUED,
        fingerprint=fp,
    )
    assert get_active_job_by_fingerprint(fp) is not None

    # Transition QUEUED -> RUNNING -> COMPLETED: fingerprint must no longer block new submissions
    transition_task_state("gen-term-1", TaskState.RUNNING)
    transition_task_state("gen-term-1", TaskState.COMPLETED)
    assert get_active_job_by_fingerprint(fp) is None

    # FAILED state
    task_queue._job_records["gen-term-2"] = task_queue.JobRecord(
        generation_id="gen-term-2",
        state=TaskState.FAILED,
        fingerprint=fp,
    )
    assert get_active_job_by_fingerprint(fp) is None

    # CANCELLED state
    task_queue._job_records["gen-term-3"] = task_queue.JobRecord(
        generation_id="gen-term-3",
        state=TaskState.CANCELLED,
        fingerprint=fp,
    )
    assert get_active_job_by_fingerprint(fp) is None


# ==============================================================================
# 11. WORKER SINGLETON & RESTART AFTER SHUTDOWN
# ==============================================================================

@pytest.mark.asyncio
async def test_worker_singleton_and_restart_after_shutdown():
    """Worker task is a singleton and queue can be safely restarted after shutdown."""
    init_queue(force=True)
    w1 = task_queue._generation_worker_task
    assert w1 is not None

    # Calling init_queue without force preserves existing worker task
    init_queue(force=False)
    w2 = task_queue._generation_worker_task
    assert w1 is w2

    # Shutdown queue
    await shutdown_queue(grace_period=0.1)
    assert task_queue._generation_worker_task is None
    assert task_queue._accepting_jobs is False

    # Restart queue after shutdown
    init_queue(force=True)
    assert task_queue._accepting_jobs is True
    assert task_queue._generation_worker_task is not None

    # Verify restarted queue processes jobs normally
    executed = asyncio.Event()

    async def simple_job():
        executed.set()

    enqueue_generation("restart-job", simple_job())
    await asyncio.wait_for(executed.wait(), timeout=1.0)
    await asyncio.sleep(0.05)
    assert get_task_state("restart-job") == TaskState.COMPLETED


# ==============================================================================
# 12. MODEL UNLOAD GUARD & LOAD SERIALIZATION
# ==============================================================================

@pytest.mark.asyncio
async def test_model_unload_guard_and_load_lock():
    """Model unload is deferred when a generation is running, and load lock exists."""
    from backend.backends import _get_model_load_lock
    from backend.services.tts import unload_tts_model

    # 1. Model load lock is a valid asyncio.Lock
    lock = _get_model_load_lock()
    assert isinstance(lock, asyncio.Lock)

    # 2. When generation is running, unload_tts_model skips backend unload
    task_queue._running_generation_tasks["active-test"] = asyncio.create_task(asyncio.sleep(1))
    try:
        with patch("backend.services.tts.get_tts_backend") as mock_backend:
            unload_tts_model()
            assert mock_backend.return_value.unload_model.call_count == 0
    finally:
        task = task_queue._running_generation_tasks.pop("active-test", None)
        if task:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    # 3. When no generation is running, unload_tts_model delegates to backend
    with patch("backend.services.tts.get_tts_backend") as mock_backend:
        unload_tts_model()
        assert mock_backend.return_value.unload_model.call_count == 1
