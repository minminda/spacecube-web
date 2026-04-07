"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Lang } from "@/lib/i18n";

interface SpaceOption { id: string; name: string; slug: string; }
interface CollectionItem { spaceId: string; space: { id: string; name: string; slug: string }; }
interface Collection { id: string; name: string; items: CollectionItem[]; }

interface Props {
  collections: Collection[];
  visitedSpaces: SpaceOption[];
  lang: Lang;
}

export default function CollectionManager({ collections: initial, visitedSpaces, lang }: Props) {
  const [collections, setCollections] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const router = useRouter();

  const t = {
    save:       lang === "ko" ? "[저장]"     : lang === "ja" ? "[保存]"         : "[Save]",
    cancel:     lang === "ko" ? "[취소]"     : lang === "ja" ? "[キャンセル]"   : "[Cancel]",
    edit:       lang === "ko" ? "수정"       : lang === "ja" ? "編集"           : "Edit",
    delete:     lang === "ko" ? "삭제"       : lang === "ja" ? "削除"           : "Delete",
    noSpace:    lang === "ko" ? "추가할 공간이 없어" : lang === "ja" ? "追加できる空間がありません" : "No spaces to add",
    close:      lang === "ko" ? "[닫기]"     : lang === "ja" ? "[閉じる]"       : "[Close]",
    addSpace:   lang === "ko" ? "공간 추가"  : lang === "ja" ? "空間を追加"     : "Add Space",
    colName:    lang === "ko" ? "컬렉션 이름..." : lang === "ja" ? "コレクション名..." : "Collection name...",
    create:     lang === "ko" ? "[만들기]"   : lang === "ja" ? "[作成]"         : "[Create]",
    newCol:     lang === "ko" ? "새 컬렉션"  : lang === "ja" ? "新しいコレクション" : "New Collection",
  };

  async function createCollection() {
    if (!newName.trim()) return;
    const res = await fetch("/api/collections", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const col = await res.json();
    setCollections((prev) => [...prev, col]);
    setNewName(""); setCreating(false);
  }

  async function renameCollection(id: string) {
    if (!editName.trim()) return;
    await fetch(`/api/collections/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, name: editName.trim() } : c)));
    setEditingId(null);
  }

  async function deleteCollection(id: string) {
    await fetch(`/api/collections/${id}`, { method: "DELETE" });
    setCollections((prev) => prev.filter((c) => c.id !== id));
  }

  async function addSpace(collectionId: string, spaceId: string) {
    const res = await fetch(`/api/collections/${collectionId}/items`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spaceId }),
    });
    const item = await res.json();
    setCollections((prev) => prev.map((c) => c.id === collectionId ? { ...c, items: [...c.items, item] } : c));
    setAddingTo(null);
  }

  async function removeSpace(collectionId: string, spaceId: string) {
    await fetch(`/api/collections/${collectionId}/items/${spaceId}`, { method: "DELETE" });
    setCollections((prev) =>
      prev.map((c) => c.id === collectionId ? { ...c, items: c.items.filter((i) => i.spaceId !== spaceId) } : c)
    );
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
                  <input autoFocus value={editName}
                    onChange={(e) => setEditName(e.target.value.slice(0, 30))}
                    onKeyDown={(e) => { if (e.key === "Enter") renameCollection(col.id); if (e.key === "Escape") setEditingId(null); }}
                    className="flex-1 text-xs bg-transparent border-b outline-none pb-0.5"
                    style={{ borderColor: "var(--dim)", color: "var(--fg)" }} />
                  <button onClick={() => renameCollection(col.id)} className="text-xs" style={{ color: "var(--dim)" }}>{t.save}</button>
                  <button onClick={() => setEditingId(null)} className="text-xs" style={{ color: "var(--dim)" }}>{t.cancel}</button>
                </div>
              ) : (
                <>
                  <p className="text-xs flex-1" style={{ color: "var(--fg)" }}>
                    {col.name}<span style={{ color: "var(--dim)" }}> ({col.items.length})</span>
                  </p>
                  <button onClick={() => { setEditingId(col.id); setEditName(col.name); }} className="text-xs" style={{ color: "var(--dim)" }}>{t.edit}</button>
                  <button onClick={() => deleteCollection(col.id)} className="text-xs" style={{ color: "var(--dim)" }}>{t.delete}</button>
                </>
              )}
            </div>

            {col.items.length > 0 && (
              <div className="space-y-1 pl-2">
                {col.items.map((item) => (
                  <div key={item.spaceId} className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: "var(--dim)" }}>·</span>
                    <Link href={`/space/${item.space.slug}`} className="text-xs flex-1" style={{ color: "var(--fg)" }}>
                      {item.space.name}
                    </Link>
                    <button onClick={() => removeSpace(col.id, item.spaceId)} className="text-xs" style={{ color: "var(--dim)" }}>−</button>
                  </div>
                ))}
              </div>
            )}

            {addingTo === col.id ? (
              <div className="pl-2 space-y-1">
                {available.length === 0
                  ? <p className="text-xs" style={{ color: "var(--dim)" }}>{t.noSpace}</p>
                  : available.map((s) => (
                    <button key={s.id} onClick={() => addSpace(col.id, s.id)}
                      className="block text-xs w-full text-left py-0.5" style={{ color: "var(--dim)" }}>
                      + {s.name}
                    </button>
                  ))}
                <button onClick={() => setAddingTo(null)} className="text-xs" style={{ color: "var(--dim)" }}>{t.close}</button>
              </div>
            ) : (
              <button onClick={() => setAddingTo(col.id)} className="text-xs pl-2" style={{ color: "var(--dim)" }}>
                + {t.addSpace}
              </button>
            )}
          </div>
        );
      })}

      {creating ? (
        <div className="flex gap-2 items-center">
          <input autoFocus value={newName}
            onChange={(e) => setNewName(e.target.value.slice(0, 30))}
            placeholder={t.colName}
            onKeyDown={(e) => { if (e.key === "Enter") createCollection(); if (e.key === "Escape") { setCreating(false); setNewName(""); } }}
            className="flex-1 text-xs bg-transparent border-b outline-none pb-0.5"
            style={{ borderColor: "var(--dim)", color: "var(--fg)" }} />
          <button onClick={createCollection} className="text-xs" style={{ color: "var(--dim)" }}>{t.create}</button>
          <button onClick={() => { setCreating(false); setNewName(""); }} className="text-xs" style={{ color: "var(--dim)" }}>{t.cancel}</button>
        </div>
      ) : (
        <button onClick={() => setCreating(true)} className="text-xs" style={{ color: "var(--dim)" }}>
          + {t.newCol}
        </button>
      )}
    </div>
  );
}
