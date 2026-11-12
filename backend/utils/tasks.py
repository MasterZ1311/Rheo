"""
Task tracking for active downloads and generations.
"""

from typing import Optional, Dict, List
import asyncio
from datetime import datetime
from dataclasses import dataclass, field


@dataclass
class DownloadTask:
    """Represents an active download task."""
    model_name: str
    status: str = "downloading"  # downloading, extracting, complete, error
    started_at: datetime = field(default_factory=datetime.utcnow)
    error: Optional[str] = None


@dataclass
class GenerationTask:
    """Represents an active generation task."""
    task_id: str
    profile_id: str
    text_preview: str  # First 50 chars of text
    started_at: datetime = field(default_factory=datetime.utcnow)


class TaskManager:
    """Manages active downloads and generations."""
    
    def __init__(self):
        self._active_downloads: Dict[str, DownloadTask] = {}
        self._download_asyncio_tasks: Dict[str, asyncio.Task] = {}
        self._active_generations: Dict[str, GenerationTask] = {}
    
    def register_download_task(self, model_name: str, task: asyncio.Task) -> None:
        """Register the underlying asyncio.Task for cancellation handling."""
        self._download_asyncio_tasks[model_name] = task

    def start_download(self, model_name: str) -> None:
        """Mark a download as started."""
        self._active_downloads[model_name] = DownloadTask(
            model_name=model_name,
            status="downloading",
        )
    
    def complete_download(self, model_name: str) -> None:
        """Mark a download as complete."""
        self._download_asyncio_tasks.pop(model_name, None)
        if model_name in self._active_downloads:
            del self._active_downloads[model_name]
    
    def error_download(self, model_name: str, error: str) -> None:
        """Mark a download as failed."""
        self._download_asyncio_tasks.pop(model_name, None)
        if model_name in self._active_downloads:
            self._active_downloads[model_name].status = "error"
            self._active_downloads[model_name].error = error
    
    def start_generation(self, task_id: str, profile_id: str, text: str) -> None:
        """Mark a generation as started."""
        text_preview = text[:50] + "..." if len(text) > 50 else text
        self._active_generations[task_id] = GenerationTask(
            task_id=task_id,
            profile_id=profile_id,
            text_preview=text_preview,
        )
    
    def complete_generation(self, task_id: str) -> None:
        """Mark a generation as complete."""
        if task_id in self._active_generations:
            del self._active_generations[task_id]
    
    def get_active_downloads(self) -> List[DownloadTask]:
        """Get all active downloads."""
        return list(self._active_downloads.values())

    def get_pending_downloads(self) -> List[DownloadTask]:
        """Get downloads that are still in flight.

        Excludes errored tasks, which stay in the active list so the
        error/retry UI can show them but must not be reported as
        "downloading" by /models/status.
        """
        return [
            task
            for task in self._active_downloads.values()
            if task.status in ("downloading", "extracting")
        ]
    
    def get_active_generations(self) -> List[GenerationTask]:
        """Get all active generations."""
        return list(self._active_generations.values())
    
    def cancel_download(self, model_name: str) -> bool:
        """Cancel/dismiss a download task (cancels running asyncio task and removes from active list)."""
        asyncio_task = self._download_asyncio_tasks.pop(model_name, None)
        if asyncio_task and not asyncio_task.done():
            asyncio_task.cancel()
        return self._active_downloads.pop(model_name, None) is not None

    def clear_all(self) -> None:
        """Clear all download and generation tasks."""
        for task in self._download_asyncio_tasks.values():
            if not task.done():
                task.cancel()
        self._download_asyncio_tasks.clear()
        self._active_downloads.clear()
        self._active_generations.clear()

    def is_download_active(self, model_name: str) -> bool:
        """Check if a download is active."""
        return model_name in self._active_downloads
    
    def is_generation_active(self, task_id: str) -> bool:
        """Check if a generation is active."""
        return task_id in self._active_generations


# Global task manager instance
_task_manager: Optional[TaskManager] = None


def get_task_manager() -> TaskManager:
    """Get or create the global task manager."""
    global _task_manager
    if _task_manager is None:
        _task_manager = TaskManager()
    return _task_manager
