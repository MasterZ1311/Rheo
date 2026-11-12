"""Model management endpoints."""

import asyncio
import logging
import os
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import models
from ..utils.platform_detect import get_backend_type
from ..services.task_queue import create_background_task
from ..utils.progress import get_progress_manager
from ..utils.tasks import get_task_manager
from ..utils.auth import require_admin

logger = logging.getLogger(__name__)

router = APIRouter()


def _get_dir_size(path: Path) -> int:
    """Get total size of a directory in bytes."""
    total = 0
    for f in path.rglob("*"):
        if f.is_file():
            total += f.stat().st_size
    return total


def _copy_with_progress(src: Path, dst: Path, progress_manager, copied_so_far: int, total_bytes: int) -> int:
    """Copy a directory tree with byte-level progress tracking."""
    dst.mkdir(parents=True, exist_ok=True)
    for item in src.iterdir():
        dest_item = dst / item.name
        if item.is_dir():
            copied_so_far = _copy_with_progress(item, dest_item, progress_manager, copied_so_far, total_bytes)
        else:
            size = item.stat().st_size
            shutil.copy2(str(item), str(dest_item))
            copied_so_far += size
            progress_manager.update_progress(
                "migration",
                copied_so_far,
                total_bytes,
                filename=item.name,
                status="downloading",
            )
    return copied_so_far


@router.post("/models/load")
async def load_model(
    model_size: str = Query(default="1.7B", pattern="^(1\\.7B|0\\.6B|1B|3B)$"),
    _admin: None = Depends(require_admin),
):
    """Manually load TTS model."""
    from ..services import tts

    try:
        tts_model = tts.get_tts_model()
        await tts_model.load_model_async(model_size)
        return {"message": f"Model {model_size} loaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/models/unload")
async def unload_model(_admin: None = Depends(require_admin)):
    """Unload the default Qwen TTS model to free memory."""
    from ..services import tts

    try:
        tts.unload_tts_model()
        return {"message": "Model unloaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/models/{model_name}/unload")
async def unload_model_by_name(model_name: str, _admin: None = Depends(require_admin)):
    """Unload a specific model from memory without deleting it from disk."""
    from ..backends import get_model_config, unload_model_by_config

    config = get_model_config(model_name)
    if not config:
        raise HTTPException(status_code=400, detail=f"Unknown model: {model_name}")

    try:
        was_loaded = unload_model_by_config(config)
        if not was_loaded:
            return {"message": f"Model {model_name} is not loaded"}
        return {"message": f"Model {model_name} unloaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/models/progress/{model_name}")
async def get_model_progress(model_name: str):
    """Get model download progress via Server-Sent Events."""
    progress_manager = get_progress_manager()

    async def event_generator():
        async for event in progress_manager.subscribe(model_name):
            yield event

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/models/cache-dir")
async def get_models_cache_dir():
    """Get the path to the active model cache directory."""
    from ..config import get_models_cache_dir as get_cache_path

    return {"path": str(get_cache_path())}


@router.post("/models/migrate")
async def migrate_models(request: models.ModelMigrateRequest, raw_request: Request):
    """Move all downloaded models to a new directory with byte-level progress via SSE."""
    from huggingface_hub import constants as hf_constants
    from ..services.model_migration import validate_migration_paths, stage_and_migrate_models

    require_admin(raw_request)

    source = Path(hf_constants.HF_HUB_CACHE)
    destination = Path(request.destination)

    try:
        model_dirs = validate_migration_paths(source, destination)
    except FileNotFoundError as err:
        raise HTTPException(status_code=404, detail=str(err)) from err
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err

    progress_manager = get_progress_manager()
    if not model_dirs:
        progress_manager.update_progress("migration", 1, 1, status="complete")
        progress_manager.mark_complete("migration")
        return {"moved": 0, "errors": [], "source": str(source), "destination": str(destination)}

    async def migrate_background():
        try:
            await stage_and_migrate_models(source, destination, progress_manager)
        except Exception as e:
            logger.error("Background model migration failed: %s", e)

    create_background_task(migrate_background())

    return {"source": str(source), "destination": str(destination)}


@router.get("/models/migrate/progress")
async def get_migration_progress():
    """Get model migration progress via Server-Sent Events."""
    progress_manager = get_progress_manager()

    async def event_generator():
        async for event in progress_manager.subscribe("migration"):
            yield event

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/models/status", response_model=models.ModelStatusListResponse)
async def get_model_status():
    """Get status of all available models."""
    from huggingface_hub import constants as hf_constants

    backend_type = get_backend_type()
    task_manager = get_task_manager()

    # Pending only — an errored task stays in the active list for the
    # error/retry UI, but reporting it as "downloading" here would mask
    # the model's real cache state until the app restarts.
    active_download_names = {task.model_name for task in task_manager.get_pending_downloads()}

    try:
        from huggingface_hub import scan_cache_dir

        use_scan_cache = True
    except ImportError:
        use_scan_cache = False

    from ..backends import get_all_model_configs, check_model_loaded
    from ..services.model_verification import verify_model_cache

    registry_configs = get_all_model_configs()
    model_configs = [
        {
            "config": cfg,
            "model_name": cfg.model_name,
            "display_name": cfg.display_name,
            "hf_repo_id": cfg.hf_repo_id,
            "model_size": cfg.model_size,
            "check_loaded": lambda c=cfg: check_model_loaded(c),
        }
        for cfg in registry_configs
    ]

    model_to_repo = {cfg["model_name"]: cfg["hf_repo_id"] for cfg in model_configs}
    active_download_repos = {model_to_repo.get(name) for name in active_download_names if name in model_to_repo}

    cache_info = None
    if use_scan_cache:
        try:
            cache_info = scan_cache_dir()
        except Exception:
            pass

    statuses = []

    for config in model_configs:
        try:
            downloaded = False
            size_mb = None
            loaded = False

            if cache_info:
                repo_id = config["hf_repo_id"]
                for repo in cache_info.repos:
                    if repo.repo_id == repo_id:
                        has_model_weights = False
                        for rev in repo.revisions:
                            for f in rev.files:
                                fname = f.file_name.lower()
                                if fname.endswith((".safetensors", ".bin", ".pt", ".pth", ".npz")):
                                    has_model_weights = True
                                    break
                            if has_model_weights:
                                break

                        has_incomplete = False
                        try:
                            cache_dir = hf_constants.HF_HUB_CACHE
                            blobs_dir = Path(cache_dir) / ("models--" + repo_id.replace("/", "--")) / "blobs"
                            if blobs_dir.exists():
                                has_incomplete = any(blobs_dir.glob("*.incomplete"))
                        except Exception:
                            pass

                        if has_model_weights and not has_incomplete:
                            downloaded = True
                            try:
                                total_size = sum(revision.size_on_disk for revision in repo.revisions)
                                size_mb = total_size / (1024 * 1024)
                            except Exception:
                                pass
                        break

            if not downloaded:
                try:
                    cache_dir = hf_constants.HF_HUB_CACHE
                    repo_cache = Path(cache_dir) / ("models--" + config["hf_repo_id"].replace("/", "--"))

                    if repo_cache.exists():
                        blobs_dir = repo_cache / "blobs"
                        has_incomplete = blobs_dir.exists() and any(blobs_dir.glob("*.incomplete"))

                        if not has_incomplete:
                            snapshots_dir = repo_cache / "snapshots"
                            has_model_files = False
                            if snapshots_dir.exists():
                                has_model_files = (
                                    any(snapshots_dir.rglob("*.bin"))
                                    or any(snapshots_dir.rglob("*.safetensors"))
                                    or any(snapshots_dir.rglob("*.pt"))
                                    or any(snapshots_dir.rglob("*.pth"))
                                    or any(snapshots_dir.rglob("*.npz"))
                                )

                            if has_model_files:
                                downloaded = True
                                try:
                                    total_size = sum(
                                        f.stat().st_size
                                        for f in repo_cache.rglob("*")
                                        if f.is_file() and not f.name.endswith(".incomplete")
                                    )
                                    size_mb = total_size / (1024 * 1024)
                                except Exception:
                                    pass
                except Exception:
                    pass

            try:
                loaded = config["check_loaded"]()
            except Exception:
                loaded = False

            is_downloading = config["hf_repo_id"] in active_download_repos

            if is_downloading:
                downloaded = False
                size_mb = None

            cfg = config["config"]
            if downloaded:
                is_valid, _ = verify_model_cache(cfg.hf_repo_id, expected_sha256=cfg.sha256_checksums or None)
                if not is_valid:
                    downloaded = False

            statuses.append(
                models.ModelStatus(
                    model_name=cfg.model_name,
                    display_name=cfg.display_name,
                    hf_repo_id=cfg.hf_repo_id,
                    downloaded=downloaded,
                    downloading=is_downloading,
                    size_mb=size_mb or (cfg.size_mb if downloaded else None),
                    loaded=loaded,
                    engine=cfg.engine,
                    description=cfg.description,
                    version=cfg.version,
                    required_disk_mb=cfg.required_disk_mb,
                    supported_hardware=cfg.supported_hardware,
                    dependencies=cfg.dependencies,
                    languages=cfg.languages,
                )
            )
        except Exception:
            try:
                loaded = config["check_loaded"]()
            except Exception:
                loaded = False

            is_downloading = config["hf_repo_id"] in active_download_repos
            cfg = config.get("config")

            statuses.append(
                models.ModelStatus(
                    model_name=config["model_name"],
                    display_name=config["display_name"],
                    hf_repo_id=config["hf_repo_id"],
                    downloaded=False,
                    downloading=is_downloading,
                    size_mb=None,
                    loaded=loaded,
                    engine=cfg.engine if cfg else None,
                    description=cfg.description if cfg else None,
                    version=cfg.version if cfg else "main",
                    required_disk_mb=cfg.required_disk_mb if cfg else None,
                    supported_hardware=cfg.supported_hardware if cfg else [],
                    dependencies=cfg.dependencies if cfg else [],
                    languages=cfg.languages if cfg else [],
                )
            )

    return models.ModelStatusListResponse(models=statuses)


@router.post("/models/download")
async def trigger_model_download(request: models.ModelDownloadRequest):
    """Trigger download of a specific model with pre-flight checks."""
    from ..backends import get_model_config, get_model_load_func
    from ..config import get_models_cache_dir
    from ..services.model_verification import verify_model_by_name

    task_manager = get_task_manager()
    progress_manager = get_progress_manager()

    config = get_model_config(request.model_name)
    if not config:
        raise HTTPException(status_code=400, detail=f"Unknown model: {request.model_name}")

    # Check if download is already in progress
    if task_manager.is_download_active(request.model_name):
        raise HTTPException(
            status_code=409,
            detail=f"Download already in progress for {request.model_name}",
        )

    # Check if model is already downloaded and verified
    is_valid, _ = verify_model_by_name(request.model_name)
    if is_valid:
        return {"message": f"Model {request.model_name} is already downloaded and verified"}

    # Pre-flight disk space check
    cache_dir = get_models_cache_dir()
    required_mb = config.required_disk_mb or config.size_mb or 500
    try:
        check_path = cache_dir if cache_dir.exists() else cache_dir.parent
        free_bytes = shutil.disk_usage(check_path).free
        free_mb = free_bytes / (1024 * 1024)
        if free_mb < required_mb:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Insufficient disk space for {config.display_name}. "
                    f"Required: {required_mb} MB, Available: {int(free_mb)} MB."
                ),
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("Could not check disk usage before download: %s", e)

    load_func = get_model_load_func(config)

    async def download_in_background():
        try:
            result = load_func()
            if asyncio.iscoroutine(result):
                await result
            # Verify downloaded model integrity
            valid, err = verify_model_by_name(request.model_name)
            if not valid:
                raise RuntimeError(f"Model integrity verification failed: {err}")
            task_manager.complete_download(request.model_name)
            progress_manager.mark_complete(request.model_name)
        except asyncio.CancelledError:
            logger.info("Download cancelled for %s", request.model_name)
            task_manager.cancel_download(request.model_name)
            progress_manager.mark_error(request.model_name, "Download cancelled")
            raise
        except Exception as e:
            logger.error("Download failed for %s: %s", request.model_name, e)
            task_manager.error_download(request.model_name, str(e))
            progress_manager.mark_error(request.model_name, str(e))

    task_manager.start_download(request.model_name)

    progress_manager.update_progress(
        model_name=request.model_name,
        current=0,
        total=0,
        filename="Connecting to HuggingFace...",
        status="downloading",
    )

    task = create_background_task(download_in_background())
    task_manager.register_download_task(request.model_name, task)

    return {"message": f"Model {request.model_name} download started"}


@router.post("/models/download/cancel")
async def cancel_model_download(request: models.ModelDownloadRequest):
    """Cancel or dismiss an active or errored download task."""
    task_manager = get_task_manager()
    progress_manager = get_progress_manager()

    removed = task_manager.cancel_download(request.model_name)

    progress_removed = False
    with progress_manager._lock:
        if request.model_name in progress_manager._progress:
            progress_manager._speed_bps.pop(request.model_name, None)
            progress_manager._last_bytes.pop(request.model_name, None)
            progress_manager._last_bytes_time.pop(request.model_name, None)
            del progress_manager._progress[request.model_name]
            progress_removed = True

    if removed or progress_removed:
        return {"message": f"Download task for {request.model_name} cancelled"}
    return {"message": f"No active task found for {request.model_name}"}


@router.delete("/models/{model_name}")
async def delete_model(model_name: str, _admin: None = Depends(require_admin)):
    """Delete a downloaded model from the HuggingFace cache."""
    from huggingface_hub import constants as hf_constants
    from ..backends import get_model_config, unload_model_by_config

    config = get_model_config(model_name)
    if not config:
        raise HTTPException(status_code=400, detail=f"Unknown model: {model_name}")

    hf_repo_id = config.hf_repo_id

    try:
        unload_model_by_config(config)

        cache_dir = hf_constants.HF_HUB_CACHE
        repo_cache_dir = Path(cache_dir) / ("models--" + hf_repo_id.replace("/", "--"))

        if not repo_cache_dir.exists():
            raise HTTPException(status_code=404, detail=f"Model {model_name} not found in cache")

        try:
            shutil.rmtree(repo_cache_dir)
        except OSError as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete model cache directory: {str(e)}")

        return {"message": f"Model {model_name} deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete model: {str(e)}")
