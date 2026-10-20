"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { JoinedProject, MasterProject } from "@/types";
import { FolderPlus, Loader2, X } from "lucide-react";

interface JoinProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  joinedProjects: JoinedProject[];
  onSuccess: () => void;
}

export default function JoinProjectModal({
  isOpen,
  onClose,
  joinedProjects,
  onSuccess,
}: JoinProjectModalProps) {
  const [allProjects, setAllProjects] = useState<MasterProject[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [priority, setPriority] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setLoadingList(true);
    api
      .getAllProjects()
      .then((list) => {
        setAllProjects(list);
        const joinedIds = new Set(joinedProjects.map((p) => String(p.id)));
        const firstUnjoined = list.find((p) => !joinedIds.has(String(p.id)));
        if (firstUnjoined) {
          setSelectedProjectId(String(firstUnjoined.id));
        } else if (list.length > 0) {
          setSelectedProjectId(String(list[0].id));
        }
      })
      .catch((err) => setError(err.message || "Gagal memuat daftar project"))
      .finally(() => setLoadingList(false));
  }, [isOpen, joinedProjects]);

  if (!isOpen) return null;

  const joinedIds = new Set(joinedProjects.map((p) => String(p.id)));
  const availableProjects = allProjects.filter(
    (p) => !joinedIds.has(String(p.id))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      setError("Pilih project terlebih dahulu");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.joinProject(selectedProjectId, priority);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Gagal bergabung ke project");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <FolderPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Join Project
              </h2>
              <p className="text-xs text-slate-500">
                Pilih project yang sedang Anda kerjakan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Pilih Project
            </label>
            {loadingList ? (
              <div className="flex items-center gap-2 py-3 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat daftar
                project...
              </div>
            ) : availableProjects.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                Semua project yang tersedia sudah Anda ikuti.
              </div>
            ) : (
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                required
              >
                {availableProjects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name} ({proj.type})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Prioritas Project
            </label>
            <div className="grid grid-cols-4 gap-2">
              {["1", "2", "3", "4"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`rounded-xl border py-2 text-xs font-bold transition ${
                    priority === p
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  P{p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || availableProjects.length === 0}
              className="flex w-1/2 items-center justify-center gap-1.5 rounded-xl bg-brand-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Gabung Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
