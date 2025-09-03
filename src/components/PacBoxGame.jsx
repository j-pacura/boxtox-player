import React, { useEffect, useRef, useState } from "react";

/**
 * Pac-BOX (grid/tick) — mobilny upgrade:
 * - duże okno gry na tel. (h-[75vh]), canvas skaluje się responsywnie,
 * - sterowanie GESTAMI (swipe: ← → ↑ ↓),
 * - overlay D-pad (duże, półprzezroczyste przyciski, zawsze na wierzchu),
 * - fioletowo-liliowe akcenty i lekkie glow.
 */

export default function PacBoxGame({ onClose }) {
  const canvasRef = useRef(null);
  const gameStateRef = useRef(null);
  const animRef = useRef(null);
  const keysRef = useRef({});
  const lastTickRef = useRef(0);
  const moveDelayRef = useRef(150);
  const ghostTurnChanceRef = useRef(0.3);
  const runningRef = useRef(true);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [running, setRunning] = useState(true);

  // --- MAPA ---
  const MAP = [
    "####################",
    "#........##........#",
    "#.##.###.##.###.##.#",
    "#o................o#",
    "#.##.#.######.#.##.#",
    "#....#...##...#....#",
    "####.###.##.###.####",
    "   #.....##.....#   ",
    "####.##......##.####",
    "#....##  GG  ##....#",
    "####.##......##.####",
    "   #.....##.....#   ",
    "####.###.##.###.####",
    "#........##........#",
    "#.##.###.##.###.##.#",
    "#o.#..........#..o#",
    "##.#.#.######.#.#.##",
    "#....#...##...#....#",
    "#.######.##.######.#",
    "#........P.........#",
    "####################",
  ];
  const CELL = 22; // odrobinę większe kafle => lepsza czytelność
  const W = MAP[0].length * CELL;
  const H = MAP.length * CELL;

  const inBounds = (x, y) => x >= 0 && x < MAP[0].length && y >= 0 && y < MAP.length;
  const isWall = (x, y) => !inBounds(x, y) || MAP[y][x] === "#";

  function findPacStart() {
    for (let y = 0; y < MAP.length; y++) {
      for (let x = 0; x < MAP[y].length; x++) if (MAP[y][x] === "P") return { x, y };
    }
    return { x: 10, y: MAP.length - 2 };
  }
  function findGhostStarts() {
    const arr = [];
    for (let y = 0; y < MAP.length; y++) {
      for (let x = 0; x < MAP[y].length; x++) if (MAP[y][x] === "G") arr.push({ x, y });
    }
    if (arr.length === 0) arr.push({ x: 9, y: 9 }, { x: 10, y: 9 }, { x: 9, y: 10 }, { x: 10, y: 10 });
    while (arr.length < 4) arr.push(arr[0]);
    return arr.slice(0, 4);
  }
  function buildDots() {
    const dots = new Set();
    for (let y = 0; y < MAP.length; y++)
      for (let x = 0; x < MAP[y].length; x++)
        if (MAP[y][x] === "." || MAP[y][x] === "o") dots.add(`${x},${y}`);
    return dots;
  }
  function resetPositions(state) {
    const p = findPacStart();
    const gs = findGhostStarts();
    state.pacman = {
      x: p.x,
      y: p.y,
      dir: { x: 1, y: 0 },
      next: { x: 1, y: 0 },
    };
    state.ghosts = [
      { x: gs[0].x, y: gs[0].y, dir: { x: 1, y: 0 }, color: "#a78bfa" }, // violet-400
      { x: gs[1].x, y: gs[1].y, dir: { x: -1, y: 0 }, color: "#22d3ee" }, // cyan-400
      { x: gs[2].x, y: gs[2].y, dir: { x: 0, y: -1 }, color: "#f472b6" }, // pink-400
      { x: gs[3].x, y: gs[3].y, dir: { x: 0, y: 1 }, color: "#f59e0b" }, // amber-500
    ];
  }

  // INIT
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // fizyczny rozmiar canvas (do rysowania w pikselach)
    canvas.width = W;
    canvas.height = H;

    gameStateRef.current = {
      pacman: { x: 10, y: MAP.length - 2, dir: { x: 1, y: 0 }, next: { x: 1, y: 0 } },
      ghosts: [],
      dots: buildDots(),
      power: 0,
    };
    resetPositions(gameStateRef.current);

    setScore(0);
    setLives(3);
    setLevel(1);
    setRunning(true);
    runningRef.current = true;
    moveDelayRef.current = 150;
    ghostTurnChanceRef.current = 0.3;
  }, []); // eslint-disable-line

  // Sterowanie klawiszami
  useEffect(() => {
    const onDown = (e) => {
      const s = gameStateRef.current;
      if (!s) return;
      switch (e.key) {
        case "ArrowLeft":
        case "a":
          s.pacman.next = { x: -1, y: 0 }; e.preventDefault(); break;
        case "ArrowRight":
        case "d":
          s.pacman.next = { x: 1, y: 0 }; e.preventDefault(); break;
        case "ArrowUp":
        case "w":
          s.pacman.next = { x: 0, y: -1 }; e.preventDefault(); break;
        case "ArrowDown":
        case "s":
          s.pacman.next = { x: 0, y: 1 }; e.preventDefault(); break;
        case " ":
          setRunning((r) => { runningRef.current = !r; return !r; });
          e.preventDefault();
          break;
        case "Escape":
          onClose?.();
          e.preventDefault();
          break;
      }
    };
    window.addEventListener("keydown", onDown, { passive: false });
    return () => window.removeEventListener("keydown", onDown);
  }, [onClose]);

  const canMove = (x, y, d) => !isWall(x + d.x, y + d.y);

  function nextLevel() {
    const s = gameStateRef.current;
    if (!s) return;
    setLevel((l) => l + 1);
    moveDelayRef.current = Math.max(70, Math.floor(moveDelayRef.current * 0.92));
    ghostTurnChanceRef.current = Math.min(0.5, ghostTurnChanceRef.current + 0.02);
    s.dots = buildDots();
    s.power = 0;
    resetPositions(s);
    setScore((sc) => sc + 100);
    lastTickRef.current = performance.now();
  }
  function loseLife() {
    setLives((lv) => {
      const nv = lv - 1;
      const s = gameStateRef.current;
      if (!s) return 3;
      if (nv <= 0) {
        setScore(0);
        setLevel(1);
        moveDelayRef.current = 150;
        ghostTurnChanceRef.current = 0.3;
        s.dots = buildDots();
      }
      s.power = 0;
      resetPositions(s);
      return nv <= 0 ? 3 : nv;
    });
    lastTickRef.current = performance.now();
  }

  // GESTY (swipe) – prosty detektor
  const touchStartRef = useRef(null);
  const onTouchStart = (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    touchStartRef.current = { x: t.clientX, y: t.clientY, t: performance.now() };
  };
  const onTouchMove = (e) => {
    // zapobiegaj przewijaniu przy gestach
    if (touchStartRef.current) e.preventDefault();
  };
  const onTouchEnd = (e) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches?.[0];
    if (!t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    const TH = 24; // próg piks.
    if (adx < TH && ady < TH) return;
    const s = gameStateRef.current;
    if (!s) return;
    if (adx > ady) {
      s.pacman.next = { x: dx > 0 ? 1 : -1, y: 0 };
    } else {
      s.pacman.next = { x: 0, y: dy > 0 ? 1 : -1 };
    }
  };

  // Pętla gry
  useEffect(() => {
    function loop(ts) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const s = gameStateRef.current;
      if (!ctx || !s) {
        animRef.current = requestAnimationFrame(loop);
        return;
      }

      if (runningRef.current && ts - lastTickRef.current >= moveDelayRef.current) {
        lastTickRef.current = ts;

        if (canMove(s.pacman.x, s.pacman.y, s.pacman.next)) {
          s.pacman.dir = { ...s.pacman.next };
        }
        if (canMove(s.pacman.x, s.pacman.y, s.pacman.dir)) {
          s.pacman.x += s.pacman.dir.x;
          s.pacman.y += s.pacman.dir.y;

          const key = `${s.pacman.x},${s.pacman.y}`;
          if (s.dots.delete(key)) {
            if (MAP[s.pacman.y][s.pacman.x] === "o") {
              setScore((v) => v + 50);
              s.power = 100;
            } else {
              setScore((v) => v + 10);
            }
            if (s.dots.size === 0) nextLevel();
          }
        }

        s.ghosts.forEach((g) => {
          const moves = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
          ].filter((d) => canMove(g.x, g.y, d));
          if (moves.length) {
            const notBack = moves.filter((d) => !(d.x === -g.dir?.x && d.y === -g.dir?.y));
            const pool = notBack.length ? notBack : moves;
            if (Math.random() < ghostTurnChanceRef.current || !g.dir || !canMove(g.x, g.y, g.dir)) {
              g.dir = pool[Math.floor(Math.random() * pool.length)];
            }
            if (g.dir && canMove(g.x, g.y, g.dir)) {
              g.x += g.dir.x;
              g.y += g.dir.y;
            }
          }
        });

        for (const g of s.ghosts) {
          if (g.x === s.pacman.x && g.y === s.pacman.y) {
            if (s.power > 0) {
              setScore((v) => v + 200);
              const home = findGhostStarts()[0];
              g.x = home.x; g.y = home.y; g.dir = { x: 0, y: -1 };
            } else {
              loseLife();
              break;
            }
          }
        }
        if (s.power > 0) s.power -= 1;
      }

      // Rysowanie (z lekkim „glass” UI)
      ctx.clearRect(0, 0, W, H);
      // tło planszy
      const grd = ctx.createLinearGradient(0, 0, W, H);
      grd.addColorStop(0, "#0b1020");
      grd.addColorStop(1, "#14122e");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);

      // ściany
      for (let y = 0; y < MAP.length; y++) {
        for (let x = 0; x < MAP[y].length; x++) {
          if (MAP[y][x] === "#") {
            ctx.fillStyle = "#6d28d9"; // violet-700
            ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
            ctx.strokeStyle = "rgba(167,139,250,0.35)"; // violet-300 glow
            ctx.strokeRect(x * CELL + 0.5, y * CELL + 0.5, CELL - 1, CELL - 1);
          }
        }
      }

      // kropki
      s.dots.forEach((key) => {
        const [x, y] = key.split(",").map(Number);
        const large = MAP[y][x] === "o";
        ctx.fillStyle = large ? "#f472b6" : "#c4b5fd"; // pink/violet
        ctx.beginPath();
        ctx.arc(
          x * CELL + CELL / 2,
          y * CELL + CELL / 2,
          large ? 5 : 2.5,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });

      // Pac-Man (żółta buźka z ustami)
      const p = s.pacman;
      const heading =
        p.dir.x === 1 ? 0 :
        p.dir.x === -1 ? Math.PI :
        p.dir.y === -1 ? -Math.PI / 2 :
        Math.PI / 2;
      const t = ts / 1000;
      const mouth = 0.15 + 0.20 * Math.abs(Math.sin(t * 6));
      ctx.fillStyle = "#fde047"; // yellow-400
      ctx.beginPath();
      ctx.moveTo(p.x * CELL + CELL / 2, p.y * CELL + CELL / 2);
      ctx.arc(
        p.x * CELL + CELL / 2,
        p.y * CELL + CELL / 2,
        CELL / 2 - 2,
        heading + mouth,
        heading - mouth,
        false
      );
      ctx.closePath();
      ctx.fill();
      // cienka poświata
      ctx.strokeStyle = "rgba(253, 224, 71, 0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x * CELL + CELL / 2, p.y * CELL + CELL / 2, CELL / 2 - 1, 0, Math.PI * 2);
      ctx.stroke();

      // Duchy
      for (const g of s.ghosts) {
        ctx.fillStyle = s.power > 0 ? "#60a5fa" : g.color; // frightened -> blue-400
        ctx.beginPath();
        ctx.arc(
          g.x * CELL + CELL / 2,
          g.y * CELL + CELL / 2,
          CELL / 2 - 2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []); // eslint-disable-line

  const restart = () => {
    const s = gameStateRef.current;
    if (!s) return;
    s.dots = buildDots();
    s.power = 0;
    resetPositions(s);
    setScore(0);
    setLives(3);
    setLevel(1);
    moveDelayRef.current = 150;
    ghostTurnChanceRef.current = 0.3;
    setRunning(true);
    runningRef.current = true;
    lastTickRef.current = performance.now();
  };

  useEffect(() => { runningRef.current = running; }, [running]);

  // Uwaga: canvas skalujemy przez CSS (width:100%), żeby na tel. był DUŻY.
  // Container ma kontrolowaną wysokość.

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-violet-800/50 bg-violet-950/40 backdrop-blur">
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-1 rounded bg-violet-900/40 border border-violet-700/50 text-violet-200">
            Score: <b>{score}</b>
          </span>
          <span className="px-2 py-1 rounded bg-violet-900/40 border border-violet-700/50 text-violet-200">
            Lives: <b>{lives}</b>
          </span>
          <span className="px-2 py-1 rounded bg-violet-900/40 border border-violet-700/50 text-violet-200">
            Level: <b>{level}</b>
          </span>
          <span className={running ? "text-emerald-400" : "text-rose-400"}>
            {running ? "RUNNING" : "PAUSED"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRunning((r) => !r)}
            className="px-3 py-2 rounded-lg border border-violet-700/50 bg-violet-900/50 hover:bg-violet-800/60 text-sm"
          >
            {running ? "Pauza" : "Wznów"}
          </button>
          <button
            onClick={restart}
            className="px-3 py-2 rounded-lg border border-violet-700/50 bg-violet-900/50 hover:bg-violet-800/60 text-sm"
          >
            Restart
          </button>
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-700 text-sm shadow-lg shadow-fuchsia-600/30"
          >
            Zamknij
          </button>
        </div>
      </div>

      {/* Obszar gry: wysoki na tel., responsywny */}
      <div
        className="relative flex-1 grid place-items-center p-3 select-none touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="relative w-full max-w-[900px] h-[75vh] md:h-[560px] rounded-xl border border-violet-800/50 bg-black/70 backdrop-blur overflow-hidden shadow-[0_0_40px_-10px_rgba(139,92,246,0.45)]">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ imageRendering: "pixelated" }}
            tabIndex={0}
          />

          {/* D-pad overlay (zawsze na wierzchu, tylko mobile) */}
          <div className="md:hidden absolute inset-x-0 bottom-3 z-20 grid grid-cols-3 gap-3 px-4">
            <div />
            <button
              onClick={() => { const s = gameStateRef.current; if (s) s.pacman.next = { x: 0, y: -1 }; }}
              className="rounded-xl border border-violet-700/40 bg-violet-900/40 backdrop-blur px-5 py-3 text-lg active:scale-95"
            >↑</button>
            <div />

            <button
              onClick={() => { const s = gameStateRef.current; if (s) s.pacman.next = { x: -1, y: 0 }; }}
              className="rounded-xl border border-violet-700/40 bg-violet-900/40 backdrop-blur px-5 py-3 text-lg active:scale-95"
            >←</button>
            <div />
            <button
              onClick={() => { const s = gameStateRef.current; if (s) s.pacman.next = { x: 1, y: 0 }; }}
              className="rounded-xl border border-violet-700/40 bg-violet-900/40 backdrop-blur px-5 py-3 text-lg active:scale-95"
            >→</button>

            <div />
            <button
              onClick={() => { const s = gameStateRef.current; if (s) s.pacman.next = { x: 0, y: 1 }; }}
              className="rounded-xl border border-violet-700/40 bg-violet-900/40 backdrop-blur px-5 py-3 text-lg active:scale-95"
            >↓</button>
            <div />
          </div>
        </div>
      </div>
    </div>
  );
}
