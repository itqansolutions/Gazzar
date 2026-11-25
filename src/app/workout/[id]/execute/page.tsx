"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import WorkoutModalRunner from "@/components/workouts/WorkoutExecution";

export default function WorkoutExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params?.id as string;
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    if (!assignmentId) return;
    let isMounted = true;
    fetch(`/api/workouts/${assignmentId}`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success && json.data?.clientId) {
          setClientId(json.data.clientId);
        }
      })
      .catch((err) => {
        console.error("[WorkoutExecutionPage] Error resolving clientId:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [assignmentId]);

  const handleClose = () => {
    if (clientId) {
      router.push(`/clients/${clientId}?tab=workouts`);
    } else if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard");
    }
  };

  if (!assignmentId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Invalid or missing workout assignment ID.
      </div>
    );
  }

  return (
    <div className="w-full min-h-[85vh] bg-slate-950 flex items-start md:items-center justify-center p-3 md:p-0">
      <WorkoutModalRunner
        assignmentId={assignmentId}
        isOpen={true}
        onClose={handleClose}
        onUpdated={() => {
          // Workout execution progress saved or completed
        }}
        standalone={true}
      />
    </div>
  );
}