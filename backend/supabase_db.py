import os
from typing import Any, Dict, List

from supabase import create_client


class SupabaseInsertResult:
    def __init__(self, record: Dict[str, Any]):
        self.inserted_id = record.get("id") or record.get("_id")
        self.record = record


class SupabaseUpdateResult:
    def __init__(self, matched_count: int = 0, data: List[Dict[str, Any]] | None = None):
        self.matched_count = matched_count
        self.data = data or []


class SupabaseDeleteResult:
    def __init__(self, deleted_count: int = 0):
        self.deleted_count = deleted_count


class SupabaseCursor:
    def __init__(self, client, table_name: str, query: Dict[str, Any] | None = None):
        self.client = client
        self.table_name = table_name
        self.query = query or {}

    def _apply_query(self, builder):
        for key, value in self.query.items():
            if key == "$or":
                continue
            if isinstance(value, dict):
                if "$in" in value:
                    builder = builder.in_(key, value["$in"])
                    continue
                if "$ne" in value:
                    builder = builder.neq(key, value["$ne"])
                    continue
            builder = builder.eq(key, value)
        return builder

    def to_list(self, limit: int = 1000):
        builder = self.client.table(self.table_name).select("*")
        builder = self._apply_query(builder)
        if limit:
            builder = builder.limit(limit)
        response = builder.execute()
        return [self._normalize_record(item) for item in response.data or []]

    def _normalize_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        if record is None:
            return None
        record = dict(record)
        record.setdefault("_id", record.get("id"))
        return record


class SupabaseCollection:
    def __init__(self, client, table_name: str):
        self.client = client
        self.table_name = table_name

    def _normalize_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        if record is None:
            return None
        record = dict(record)
        if "_id" in record and "id" not in record:
            record["id"] = str(record["_id"])
        if "_id" in record:
            del record["_id"]
        return record

    def _normalize_query(self, query: Dict[str, Any]) -> Dict[str, Any]:
        normalized = {}
        for key, value in (query or {}).items():
            if key == "_id":
                normalized["id"] = value
            else:
                normalized[key] = value
        return normalized

    def _apply_filters(self, builder, query: Dict[str, Any]):
        for key, value in self._normalize_query(query).items():
            if isinstance(value, dict):
                if "$in" in value:
                    builder = builder.in_(key, value["$in"])
                    continue
                if "$ne" in value:
                    builder = builder.neq(key, value["$ne"])
                    continue
            builder = builder.eq(key, value)
        return builder

    def find(self, query: Dict[str, Any] | None = None):
        return SupabaseCursor(self.client, self.table_name, query)

    async def find_one(self, query: Dict[str, Any] | None = None):
        builder = self.client.table(self.table_name).select("*")
        builder = self._apply_filters(builder, query or {})
        response = builder.maybe_single().execute()
        return self._normalize_record(response.data)

    async def insert_one(self, document: Dict[str, Any]):
        payload = self._normalize_record(document)
        response = self.client.table(self.table_name).insert(payload).select("*").execute()
        item = (response.data or [None])[0]
        return SupabaseInsertResult(self._normalize_record(item))

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any]):
        payload = update.get("$set", update)
        payload = self._normalize_record(payload)
        builder = self.client.table(self.table_name).update(payload)
        builder = self._apply_filters(builder, query)
        response = builder.execute()
        return SupabaseUpdateResult(matched_count=len(response.data or []), data=response.data)

    async def update_many(self, query: Dict[str, Any], update: Dict[str, Any]):
        if "$set" in update:
            payload = self._normalize_record(update["$set"])
            builder = self.client.table(self.table_name).update(payload)
            builder = self._apply_filters(builder, query)
            response = builder.execute()
            return SupabaseUpdateResult(matched_count=len(response.data or []), data=response.data)

        if "$pull" in update:
            field, condition = next(iter(update["$pull"].items()))
            response = self.client.table(self.table_name).select("*")
            response = self._apply_filters(response, query)
            rows = response.execute().data or []
            for row in rows:
                current = row.get(field) or []
                filtered = []
                for item in current:
                    if isinstance(item, dict) and all(item.get(k) == v for k, v in condition.items()):
                        continue
                    filtered.append(item)
                self.client.table(self.table_name).update({field: filtered}).eq("id", row["id"]).execute()
            return {"data": rows}

        return {"data": []}

    async def delete_one(self, query: Dict[str, Any]):
        builder = self.client.table(self.table_name).delete()
        builder = self._apply_filters(builder, query)
        response = builder.execute()
        return SupabaseDeleteResult(deleted_count=response.count or len(response.data or []))

    async def delete_many(self, query: Dict[str, Any]):
        builder = self.client.table(self.table_name).delete()
        builder = self._apply_filters(builder, query)
        response = builder.execute()
        return SupabaseDeleteResult(deleted_count=response.count or len(response.data or []))

    async def count_documents(self, query: Dict[str, Any] | None = None):
        builder = self.client.table(self.table_name).select("id", count="exact")
        builder = self._apply_filters(builder, query or {})
        response = builder.execute()
        return response.count or 0


class SupabaseDatabase:
    def __init__(self, url: str, key: str):
        self.client = create_client(url, key)

    def __getattr__(self, name: str):
        return SupabaseCollection(self.client, name)
