import { useEffect, useMemo, useState } from "react";
import {
  ClockCircleOutlined,
  PlusOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Button, Progress, Segmented } from "antd";
import type { Exercise, WorkoutCell } from "../../api/types";
import { repsPatternFromCell } from "./workoutSetReps";

type Props = {
  exercise?: Exercise;
  lastSession?: WorkoutCell;
  lastSessionDate?: string;
  loading: boolean;
  onLogSession: () => void;
  onAddExercise: () => void;
};

function formatWeight(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "");
}

export default function WorkoutTodayPanel({
  exercise,
  lastSession,
  lastSessionDate,
  loading,
  onLogSession,
  onAddExercise,
}: Props) {
  const [restSeconds, setRestSeconds] = useState(90);
  const [remaining, setRemaining] = useState(90);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          setRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const timerLabel = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  const timerPercent = useMemo(
    () => Math.max(0, Math.min(100, ((restSeconds - remaining) / restSeconds) * 100)),
    [remaining, restSeconds],
  );
  const chooseRest = (seconds: number) => {
    setRestSeconds(seconds);
    setRemaining(seconds);
    setRunning(false);
  };

  return (
    <section className="workout-today" aria-label="Today workout">
      <div className="workout-today__main">
        <p className="workout-today__eyebrow">
          <ThunderboltOutlined /> Today
        </p>
        {exercise ? (
          <>
            <h2 className="workout-today__title">{exercise.name}</h2>
            <p className="workout-today__subtitle">
              {lastSession ? (
                <>
                  Last{lastSessionDate ? ` · ${lastSessionDate}` : ""}:{" "}
                  <strong>{formatWeight(lastSession.weightKg)} kg</strong> ·{" "}
                  {repsPatternFromCell(lastSession)}
                </>
              ) : (
                "No sessions yet — start with a comfortable working weight."
              )}
            </p>
            <div className="workout-today__targets">
              <div>
                <span>Suggested next</span>
                <strong>
                  {lastSession ? `${formatWeight(lastSession.weightKg + 2.5)} kg` : "20 kg"}
                </strong>
              </div>
              <div>
                <span>Working sets</span>
                <strong>{lastSession ? `${lastSession.setCount} sets` : "3 sets"}</strong>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 className="workout-today__title">Start your workout log</h2>
            <p className="workout-today__subtitle">
              Add the first exercise, then log today’s working sets.
            </p>
          </>
        )}
        <div className="workout-today__actions">
          <Button
            type="primary"
            size="large"
            loading={loading}
            disabled={!exercise}
            onClick={onLogSession}
          >
            Log today
          </Button>
          <Button size="large" icon={<PlusOutlined />} onClick={onAddExercise}>
            Add exercise
          </Button>
        </div>
      </div>

      <div className="workout-today__timer">
        <div className="workout-today__timer-head">
          <span>
            <ClockCircleOutlined /> Rest timer
          </span>
          <Segmented
            size="small"
            value={restSeconds}
            options={[
              { label: "60s", value: 60 },
              { label: "90s", value: 90 },
              { label: "2m", value: 120 },
            ]}
            onChange={(value) => chooseRest(Number(value))}
          />
        </div>
        <Progress
          percent={timerPercent}
          showInfo={false}
          strokeColor="var(--linear-primary)"
          trailColor="var(--linear-surface-3)"
        />
        <div className="workout-today__timer-controls">
          <strong aria-live="polite">{timerLabel}</strong>
          <Button
            size="small"
            onClick={() => {
              if (remaining === 0) {
                setRemaining(restSeconds);
              }
              setRunning((current) => !current);
            }}
          >
            {running ? "Pause" : remaining === 0 ? "Restart" : "Start"}
          </Button>
          <Button
            size="small"
            type="text"
            onClick={() => {
              setRunning(false);
              setRemaining(restSeconds);
            }}
          >
            Reset
          </Button>
        </div>
      </div>
    </section>
  );
}
