"""
Generation versions management module.

Each generation can have multiple audio versions: a clean (unprocessed)
version and any number of processed versions with different effects chains.
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import List, Optional

from sqlalchemy.orm import Session

from ..database import (
    GenerationVersion as DBGenerationVersion,
    Generation as DBGeneration,
)
from ..models import GenerationVersionResponse, EffectConfig
from .. import config


def _version_response(v: DBGenerationVersion) -> GenerationVersionResponse:
    """Convert a DB version row to a Pydantic response."""
    effects_chain = None
    if v.effects_chain:
        raw = json.loads(v.effects_chain)
        effects_chain = [EffectConfig(**e) for e in raw]
    return GenerationVersionResponse(
        id=v.id,
        generation_id=v.generation_id,
        label=v.label,
        audio_path=v.audio_path,
        effects_chain=effects_chain,
        source_version_id=v.source_version_id,
        is_default=v.is_default,
        created_at=v.created_at,
    )


def list_versions(generation_id: str, db: Session) -> List[GenerationVersionResponse]:
    """List all versions for a generation."""
    versions = (
        db.query(DBGenerationVersion)
        .filter_by(generation_id=generation_id)
        .order_by(DBGenerationVersion.created_at)
        .all()
    )
    return [_version_response(v) for v in versions]


def get_version(version_id: str, db: Session) -> Optional[GenerationVersionResponse]:
    """Get a specific version by ID."""
    v = db.query(DBGenerationVersion).filter_by(id=version_id).first()
    if not v:
        return None
    return _version_response(v)


def get_default_version(generation_id: str, db: Session) -> Optional[GenerationVersionResponse]:
    """Get the default version for a generation."""
    v = (
        db.query(DBGenerationVersion)
        .filter_by(generation_id=generation_id, is_default=True)
        .first()
    )
    if not v:
        # Fallback: return the first version
        v = (
            db.query(DBGenerationVersion)
            .filter_by(generation_id=generation_id)
            .order_by(DBGenerationVersion.created_at)
            .first()
        )
    if not v:
        return None
    return _version_response(v)


def create_version(
    generation_id: str,
    label: str,
    audio_path: str,
    db: Session,
    effects_chain: Optional[List[dict]] = None,
    is_default: bool = False,
    source_version_id: Optional[str] = None,
) -> GenerationVersionResponse:
    """Create a new version for a generation.

    If ``is_default`` is True, all other versions for this generation
    are un-defaulted first.
    """
    if is_default:
        _clear_defaults(generation_id, db)

    version = DBGenerationVersion(
        id=str(uuid.uuid4()),
        generation_id=generation_id,
        label=label,
        audio_path=audio_path,
        effects_chain=json.dumps(effects_chain) if effects_chain else None,
        source_version_id=source_version_id,
        is_default=is_default,
    )
    db.add(version)
    db.commit()
    db.refresh(version)

    # If this version is the default, update the generation's audio_path
    if is_default:
        gen = db.query(DBGeneration).filter_by(id=generation_id).first()
        if gen:
            gen.audio_path = audio_path
            db.commit()

    return _version_response(version)


def set_default_version(version_id: str, db: Session) -> Optional[GenerationVersionResponse]:
    """Set a version as the default for its generation."""
    version = db.query(DBGenerationVersion).filter_by(id=version_id).first()
    if not version:
        return None

    _clear_defaults(version.generation_id, db)
    version.is_default = True
    db.commit()
    db.refresh(version)

    # Update generation's audio_path to point to this version
    gen = db.query(DBGeneration).filter_by(id=version.generation_id).first()
    if gen:
        gen.audio_path = version.audio_path
        db.commit()

    return _version_response(version)


def delete_version(version_id: str, db: Session) -> bool:
    """Delete a version atomically. Cannot delete the last remaining version."""
    version = db.query(DBGenerationVersion).filter_by(id=version_id).first()
    if not version:
        return False

    # Don't allow deleting the last version
    count = (
        db.query(DBGenerationVersion)
        .filter_by(generation_id=version.generation_id)
        .count()
    )
    if count <= 1:
        return False

    was_default = version.is_default
    gen_id = version.generation_id
    raw_audio_path = version.audio_path
    audio_path = config.resolve_storage_path(raw_audio_path)

    # Check whether other versions or generations share this audio file
    is_shared = False
    if raw_audio_path:
        v_count = (
            db.query(DBGenerationVersion)
            .filter(DBGenerationVersion.audio_path == raw_audio_path, DBGenerationVersion.id != version_id)
            .count()
        )
        g_count = (
            db.query(DBGeneration)
            .filter(DBGeneration.audio_path == raw_audio_path, DBGeneration.id != gen_id)
            .count()
        )
        is_shared = (v_count + g_count) > 0

    try:
        db.delete(version)
        # If this was default, promote first remaining version in the SAME transaction
        if was_default:
            first = (
                db.query(DBGenerationVersion)
                .filter(DBGenerationVersion.generation_id == gen_id, DBGenerationVersion.id != version_id)
                .order_by(DBGenerationVersion.created_at)
                .first()
            )
            if first:
                first.is_default = True
                gen = db.query(DBGeneration).filter_by(id=gen_id).first()
                if gen:
                    gen.audio_path = first.audio_path
        db.commit()
    except Exception:
        db.rollback()
        raise

    # Only unlink if unshared and commit succeeded
    if not is_shared and audio_path is not None and audio_path.exists():
        try:
            audio_path.unlink()
        except OSError:
            pass

    return True


def delete_versions_for_generation(generation_id: str, db: Session, commit: bool = True) -> int:
    """Delete all versions for a generation, deferring file unlinks until commit succeeds."""
    versions = (
        db.query(DBGenerationVersion)
        .filter_by(generation_id=generation_id)
        .all()
    )
    count = len(versions)
    files_to_unlink = []
    for v in versions:
        audio_path = config.resolve_storage_path(v.audio_path)
        if audio_path is not None and audio_path.exists():
            files_to_unlink.append(audio_path)

    if count > 0:
        db.query(DBGenerationVersion).filter_by(generation_id=generation_id).update(
            {"source_version_id": None}, synchronize_session=False
        )
        db.query(DBGenerationVersion).filter_by(generation_id=generation_id).delete(
            synchronize_session=False
        )
        db.flush()

    if commit and count > 0:
        try:
            db.commit()
        except Exception:
            db.rollback()
            raise
        for p in files_to_unlink:
            try:
                p.unlink()
            except OSError:
                pass
    return count


def _clear_defaults(generation_id: str, db: Session) -> None:
    """Clear the is_default flag on all versions for a generation."""
    db.query(DBGenerationVersion).filter_by(
        generation_id=generation_id, is_default=True
    ).update({"is_default": False})
    db.flush()
