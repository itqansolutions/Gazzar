"use client";

import React, { useState } from "react";
import WorkoutModalRunner, { WorkoutModalRunnerProps } from "@/components/workouts/WorkoutModalRunner";
import PartsWorkoutView from "@/components/workouts/PartsWorkoutView";

/**
 * Default athlete experience: simple sequential parts with Start/Done and timers.
 * The previous detailed per-set logger stays available through the "Detailed logging" switch.
 */
export default function WorkoutExecution(props: WorkoutModalRunnerProps) {
  const [detailed, setDetailed] = useState(false);
  if (!props.isOpen) return null;
  if (detailed) return <WorkoutModalRunner {...props} />;
  return (
    <PartsWorkoutView
      assignmentId={props.assignmentId}
      onClose={props.onClose}
      onUpdated={props.onUpdated}
      standalone={props.standalone}
      onSwitchDetailed={() => setDetailed(true)}
    />
  );
}
