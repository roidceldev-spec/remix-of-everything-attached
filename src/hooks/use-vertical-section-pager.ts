import { useCallback, useEffect, useRef, useState } from "react";

const SWIPE_DISTANCE = 36;
const SWIPE_VELOCITY = 500;

type Point = { y: number; time: number };

export function useVerticalSectionPager(
  sectionCount: number,
  canNavigate?: (fromIndex: number, toIndex: number) => boolean,
) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const positionRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const wheelLockedRef = useRef(false);
  const wheelTimerRef = useRef<number | null>(null);
  const didDragRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startY: number;
    startPosition: number;
    history: Point[];
  } | null>(null);
  const [index, setIndexState] = useState(0);

  const viewportHeight = useCallback(
    () => viewportRef.current?.clientHeight ?? window.innerHeight,
    [],
  );

  const setPosition = useCallback((position: number) => {
    positionRef.current = position;
    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(0, ${position}px, 0)`;
    }
  }, []);

  const stopAnimation = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const springTo = useCallback(
    (target: number, initialVelocity = 0) => {
      stopAnimation();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setPosition(target);
        return;
      }

      let position = positionRef.current;
      let velocity = initialVelocity;
      let previousTime = performance.now();
      const stiffness = 210;
      const damping = 29;

      const frame = (time: number) => {
        const deltaSeconds = Math.min(0.032, Math.max(0.001, (time - previousTime) / 1000));
        previousTime = time;
        const displacement = position - target;
        const acceleration = -stiffness * displacement - damping * velocity;
        velocity += acceleration * deltaSeconds;
        position += velocity * deltaSeconds;
        setPosition(position);

        if (Math.abs(position - target) < 0.35 && Math.abs(velocity) < 4) {
          setPosition(target);
          frameRef.current = null;
          return;
        }
        frameRef.current = window.requestAnimationFrame(frame);
      };
      frameRef.current = window.requestAnimationFrame(frame);
    },
    [setPosition, stopAnimation],
  );

  const goTo = useCallback(
    (requestedIndex: number, velocity = 0) => {
      const currentIndex = indexRef.current;
      const singleStepRequest =
        Math.abs(requestedIndex - currentIndex) > 1
          ? currentIndex + Math.sign(requestedIndex - currentIndex)
          : requestedIndex;
      const nextIndex = Math.max(0, Math.min(sectionCount - 1, singleStepRequest));
      if (nextIndex !== currentIndex && canNavigate && !canNavigate(currentIndex, nextIndex)) {
        springTo(-currentIndex * viewportHeight());
        return;
      }
      indexRef.current = nextIndex;
      setIndexState(nextIndex);
      springTo(-nextIndex * viewportHeight(), velocity);
      window.requestAnimationFrame(() => viewportRef.current?.focus({ preventScroll: true }));
    },
    [canNavigate, sectionCount, springTo, viewportHeight],
  );

  useEffect(() => {
    const resize = () => {
      stopAnimation();
      setPosition(-indexRef.current * viewportHeight());
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [setPosition, stopAnimation, viewportHeight]);

  useEffect(
    () => () => {
      stopAnimation();
      if (wheelTimerRef.current !== null) window.clearTimeout(wheelTimerRef.current);
    },
    [stopAnimation],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || dragRef.current) return;
    stopAnimation();
    didDragRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startPosition: positionRef.current,
      history: [{ y: event.clientY, time: performance.now() }],
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const height = viewportHeight();
    let delta = event.clientY - drag.startY;
    if (Math.abs(delta) > 10) didDragRef.current = true;
    const atFirst = indexRef.current === 0 && delta > 0;
    const atLast = indexRef.current === sectionCount - 1 && delta < 0;
    if (atFirst || atLast) delta = rubberband(delta, height);
    setPosition(drag.startPosition + delta);
    drag.history.push({ y: event.clientY, time: performance.now() });
    if (drag.history.length > 5) drag.history.shift();
  };

  const finishPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    const delta = event.clientY - drag.startY;
    const velocity = releaseVelocity(drag.history);
    if (delta < -SWIPE_DISTANCE || velocity < -SWIPE_VELOCITY) {
      goTo(indexRef.current + 1, velocity);
    } else if (delta > SWIPE_DISTANCE || velocity > SWIPE_VELOCITY) {
      goTo(indexRef.current - 1, velocity);
    } else {
      goTo(indexRef.current, velocity);
    }
  };

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (wheelLockedRef.current || Math.abs(event.deltaY) < 6) return;
    wheelLockedRef.current = true;
    goTo(indexRef.current + (event.deltaY > 0 ? 1 : -1), -event.deltaY * 7);
    if (wheelTimerRef.current !== null) window.clearTimeout(wheelTimerRef.current);
    wheelTimerRef.current = window.setTimeout(() => {
      wheelLockedRef.current = false;
    }, 700);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (["ArrowDown", "PageDown", " "].includes(event.key)) {
      event.preventDefault();
      goTo(indexRef.current + 1);
    } else if (["ArrowUp", "PageUp"].includes(event.key)) {
      event.preventDefault();
      goTo(indexRef.current - 1);
    }
  };

  const onClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!didDragRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    didDragRef.current = false;
  };

  return {
    index,
    viewportRef,
    trackRef,
    goTo,
    interactionProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishPointer,
      onPointerCancel: finishPointer,
      onWheel,
      onKeyDown,
      onClickCapture,
    },
  };
}

function releaseVelocity(history: Point[]): number {
  if (history.length < 2) return 0;
  const last = history[history.length - 1];
  const first = history[Math.max(0, history.length - 4)];
  const elapsed = Math.max(1, last.time - first.time);
  return ((last.y - first.y) / elapsed) * 1000;
}

function rubberband(distance: number, dimension: number, constant = 0.55): number {
  return (distance * dimension * constant) / (dimension + constant * Math.abs(distance));
}
