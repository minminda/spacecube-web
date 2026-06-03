"use client";
import { useState } from "react";
import Link from "next/link";

interface SpaceOption { id: string; name: string; slug: string; }
interface CollectionItem { spaceId: string; space: { id: string; name: string; slug: string }; }
interface Collection { id: string; name: string; items: CollectionItem[]; }
interface Props { collections: Collection[]; visitedSpaces: SpaceOption[]; }

export default function CollectionManager({ collections: initial, visitedSpaces }: Props) {
  const [collections, setCollections] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);

  async function createCollection() {
    if (!newName.trim()) return;
    const res = await fetch("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName.trim() }) });
    const col = await res.json();
    setCollections((prev) => [...prev, col]); setNewName(""); setCreating(false);
  }

  async function renameCollection(id: string) {
    if (!editName.trim()) return;
    await fetch(`/api/collections/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName.trim() }) });
    setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, name: editName.trim() } : c))); setEditingId(null);
  }

  async function deleteCollection(id: string) {
    await fetch(`/api/collections/${id}`, { method: "DELETE" });
    setCollections((prev) => prev.filter((c) => c.id !== id));
  }

  async function addSpace(collectionId: string, spaceId: string) {
    const res = await fetch(`/api/collections/${collectionId}/items`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spaceId }) });
    const item = await res.json();
    setCollections((prev) => prev.map((c) => c.id === collectionId ? { ...c, items: [...c.items, item] } : c)); setAddingTo(null);
  }

  async function removeSpace(collectionId: string, spaceId: string) {
    await fetch(`/api/collections/${collectionId}/items/${spaceId}`, { method: "DELETE" });
    setCollections((prev) => prev.map((c) => c.id === collectionId ? { ...c, items: c.items.filter((i) => i.spaceId !== spaceId) } : c));
  }

  return (
    <div className="space-y-4">
      {collections.map((col) => {
        const available = visitedSpaces.filter((s) => !col.items.some((i) => i.spaceId === s.id));
        return (
          <div key={col.id} className="space-y-2">
            <div className="flex items-center gap-2">
              {editingId === col.id ? (
                <div className="flex gap-2 flex-1">
                  <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value.slice(0, 30))}
                    onKeyDown={(e) => { if (e.key === "Enter") renameCollection(col.id); if (e.key === "Escape") setEditingId(null); }}
                    className="flex-1 text-xs bg-transparent border-b outline-none pb-0.5" style={{ borderColor: "var(--dim)", color: "var(--fg)" }} />
                  <button onClick={() => renameCollection(col.id)} className="text-xs" style={{ color: "var(--dim)" }}>[저장]</button>
                  <button onClick={() => setEditingId(null)} className="text-xs" style={{ color: "var(--dim)" }}>[취소]</button>
                </div>
              ) : (
                <>
                  <p className="text-xs flex-1" style={{ color: "var(--fg)" }}>{col.name}<span style={{ color: "var(--dim)" }}> ({col.items.length})</span></p>
                  <button onClick={() => { setEditingId(col.id); setEditName(col.name); }} className="text-xs" style={{ color: "var(--dim)" }}>수정</button>
                  <button onClick={() => deleteCollection(col.id)} className="text-xs" style={{ color: "var(--dim)" }}>삭제</button>
                </>
              )}
            </div>

            {col.items.length > 0 && (
              <div className="space-y-1 pl-2">
                {col.items.map((item) => (
                  <div key={item.spaceId} className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: "var(--dim)" }}>·</span>
                    <Link href={`/space/${item.space.slug}`} className="text-xs flex-1" style={{ color: "var(--fg)" }}>{item.space.name}</Link>
                    <button onClick={() => removeSpace(col.id, item.spaceId)} className="text-xs" style={{ color: "var(--dim)" }}>−</button>
                  </div>
                ))}
              </div>
            )}

            {addingTo === col.id ? (
              <div className="pl-2 space-y-1">
                {available.length === 0
                  ? <p className="text-xs" style={{ color: "var(--dim)" }}>추가할 공간이 없어</p>
                  : available.map((s) => (
                    <button key={s.id} onClick={() => addSpace(col.id, s.id)} className="block text-xs w-full text-left py-0.5" style={{ color: "var(--dim)" }}>+ {s.name}</button>
                  ))}
                <button onClick={() => setAddingTo(null)} className="text-xs" style={{ color: "var(--dim)" }}>[닫기]</button>
              </div>
            ) : (
              <button onClick={() => setAddingTo(col.id)} className="text-xs pl-2" style={{ color: "var(--dim)" }}>+ 공간 추가</button>
            )}
          </div>
        );
      })}

      {creating ? (
        <div className="flex gap-2 items-center">
          <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value.slice(0, 30))} placeholder="컬렉션 이름..."
            onKeyDown={(e) => { if (e.key === "Enter") createCollection(); if (e.key === "Escape") { setCreating(false); setNewName(""); } }}
            className="flex-1 text-xs bg-transparent border-b outline-none pb-0.5" style={{ borderColor: "var(--dim)", color: "var(--fg)" }} />
          <button onClick={createCollection} className="text-xs" style={{ color: "var(--dim)" }}>[만들기]</button>
          <button onClick={() => { setCreating(false); setNewName(""); }} className="text-xs" style={{ color: "var(--dim)" }}>[취소]</button>
        </div>
      ) : (
        <button onClick={() => setCreating(true)} className="text-xs" style={{ color: "var(--dim)" }}>+ 새 컬렉션</button>
      )}
    </div>
  );
}
