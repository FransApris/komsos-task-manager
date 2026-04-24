import React from 'react';

/** Reusable animated pulse block */
const S = ({ className }: { className: string }) => (
  <div className={`animate-pulse bg-gray-800/80 ${className}`} />
);

// ─── Task Card ────────────────────────────────────────────────────────────────
/** Skeleton matching the task card in TasksScreen */
export const TaskCardSkeleton: React.FC = () => (
  <div className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 relative overflow-hidden">
    {/* Status left bar */}
    <div className="absolute left-0 top-0 bottom-0 w-1.5 animate-pulse bg-gray-800" />
    <div className="pl-3 space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <S className="h-2.5 w-14 rounded-full" />
          <S className="h-5 w-48 rounded-lg" />
        </div>
        <S className="h-8 w-8 rounded-lg shrink-0" />
      </div>
      <S className="h-3 w-28 rounded-full" />
      <div className="flex justify-between items-center">
        <S className="h-3 w-20 rounded-full" />
        <div className="flex -space-x-1.5">
          {[0, 1, 2].map(i => (
            <S key={i} className="w-6 h-6 rounded-full ring-2 ring-[#151b2b]" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ─── Ticket Row (Helpdesk) ────────────────────────────────────────────────────
/** Skeleton matching the ticket list row in HelpdeskScreen */
export const TicketRowSkeleton: React.FC = () => (
  <div className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 flex items-start gap-4">
    <S className="w-11 h-11 rounded-xl shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="flex justify-between items-center">
        <S className="h-4 w-40 rounded-lg" />
        <S className="h-4 w-12 rounded-md" />
      </div>
      <S className="h-3 w-56 rounded-full" />
      <S className="h-2.5 w-24 rounded-full" />
    </div>
  </div>
);

// ─── User Card (Verification) ─────────────────────────────────────────────────
/** Skeleton matching the user card in UserVerificationScreen */
export const UserCardSkeleton: React.FC = () => (
  <div className="bg-[#151b2b] p-5 rounded-2xl border border-gray-800 space-y-4">
    <div className="flex items-center gap-4">
      <S className="w-12 h-12 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <S className="h-4 w-36 rounded-lg" />
        <S className="h-3 w-48 rounded-full" />
      </div>
    </div>
    <div className="flex gap-2 pt-2">
      <S className="h-10 flex-1 rounded-xl" />
      <S className="h-10 flex-1 rounded-xl" />
      <S className="h-10 w-10 rounded-xl shrink-0" />
    </div>
  </div>
);

// ─── Kanban Card (VCast) ──────────────────────────────────────────────────────
/** Skeleton matching a single card in the VCast Kanban board */
export const KanbanCardSkeleton: React.FC = () => (
  <div className="bg-[#0a0f18] p-4 rounded-xl border border-gray-800 space-y-2.5">
    <S className="h-4 w-full rounded-lg" />
    <S className="h-3 w-4/5 rounded-full" />
    <S className="h-3 w-3/5 rounded-full" />
    <div className="flex justify-between pt-2 border-t border-gray-800">
      <S className="h-3 w-20 rounded-full" />
      <S className="h-5 w-16 rounded-md" />
    </div>
  </div>
);

// ─── Report Card ──────────────────────────────────────────────────────────────
/** Skeleton matching the report archive card in ReportsScreen */
export const ReportCardSkeleton: React.FC = () => (
  <div className="bg-[#151b2b] p-5 rounded-2xl border border-gray-800 space-y-4">
    <div className="flex items-center gap-3">
      <S className="w-10 h-10 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <S className="h-4 w-48 rounded-lg" />
        <S className="h-3 w-24 rounded-full" />
      </div>
      <S className="h-8 w-14 rounded-xl shrink-0" />
    </div>
    <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-800">
      {[0, 1, 2].map(i => (
        <div key={i} className="space-y-1.5">
          <S className="h-2.5 w-full rounded-full" />
          <S className="h-5 w-3/4 rounded-lg" />
        </div>
      ))}
    </div>
  </div>
);
