"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { JoinedProject, MasterProject } from "@/types";
import { ChevronDown, FolderPlus, Loader2, X } from "lucide-react";

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
    document.body.style.overflow = "hidden";
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

    return () => {
      document.body.style.overflow = "";
    };
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl"
      >
        {/* Mobile Drag Indicator */}
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-200 sm:hidden" />

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 pb-3.5 pt-3 sm:pt-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
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
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-y-auto overscroll-contain px-5 pt-4 pb-safe sm:pb-5"
        >
          <div className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-600">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Pilih Project <span className="text-red-500">*</span>
              </label>
              {loadingList ? (
                <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                  Memuat daftar project...
                </div>
              ) : availableProjects.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-500">
                  Semua project yang tersedia sudah Anda ikuti.
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-3.5 pr-9 text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    required
                  >
                    {availableProjects.map((proj) => (
                      <option key={proj.id} value={proj.id}>
                        {proj.name} ({proj.type})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
                </div>
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
                    className={`h-11 rounded-xl border text-xs font-bold transition active:scale-95 ${
                      priority === p
                        ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    P{p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 w-1/2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 transition active:scale-95 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || availableProjects.length === 0}
              className="flex h-11 w-1/2 items-center justify-center gap-1.5 rounded-xl bg-brand-600 text-xs font-bold text-white shadow-sm transition active:scale-95 hover:bg-brand-700 disabled:opacity-50"
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
