import React, { useEffect, useRef, useState, useMemo } from "react";

// Prosta gra w stylu Pac-Man (Pac-BOX) na <canvas>
// Sterowanie: strzałki, Spacja (pauza), Esc (zamknij). Na mobile są przyciski kierunkowe.

export default function PacBoxGame({ onClose }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const focusRef = useRef(null);

  const [running, setRunning] = useState(true);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);

  const MAP = useMemo(
    () => [
      "#####################",
      "#.........#.........#",
      "#.###.###.#.###.###.#",
      "#o# #.# #.#.# #.# #o#",
      "#.###.###.#.###.###.#",
      "#...................#",
      "#.###.#.#####.#.###.#",
      "#.....#...#...#.....#",
      "#####.### # ###.#####",
      "    #.#   G   #.#    ",
      "#####.# ## ## #.#####",
      "#.........P.........#",
      "#.###.###.#.###.###.#",
      "#o..#..... .....#..o#",
      "###.#.#.#####.#.#.###",
      "#.....#...#...#.....#",
      "#.########.#.########",
      "#...................#",
      "#####################",
    ],
    []
  );

  const TILE = 22;
  const ROWS = MAP.length;
  const COLS = MAP[0].length;
  const W = COLS * TILE;
  const H = ROWS * TILE;

  const startPac = useMemo(() => {
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++)
        if (MAP[y][x] === "P") return { x, y };
    return { x: 1, y: 1 };
  }, [MAP]);

  const startGhosts = useMemo(() => {
    const arr = [];
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++)
        if (MAP[y][x] === "G") arr.push({ x, y });
    if (arr.length === 0) arr.push({ x: (COLS / 2) | 0, y: (ROWS / 2) | 0 });
    return arr;
  }, [MAP]);

  const stateRef = useRef(null);

  const isWall = (x, y) =>
    x < 0 || y < 0 || x >= COLS || y >= ROWS ? true : MAP[y][x] === "#";
  const isPower = (x, y) => MAP[y][x] === "o";

  // Inicjalizacja
  useEffect(() => {
    const dots = new Set();
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++)
        if (MAP[y][x] === "." || MAP[y][x] === "o") dots.add(`${x},${y}`);

    const ghosts = startGhosts.map((g, i) => ({
      x: g.x + 0.5,
      y: g.y + 0.5,
      dir: { x: 0, y: -1 },
      color: ["#ef4444", "#22d3ee", "#f472b6", "#f59e0b"][i % 4],
      frightened: 0,
    }));

    stateRef.current = {
      pac: {
        x: startPac.x + 0.5,
        y: startPac.y + 0.5,
        dir: { x: 1, y: 0 },
        next: { x: 1, y: 0 },
      },
      ghosts,
      dots,
      last: performance.now(),
    };

    setScore(0);
    setLives(3);
    setLevel(1);
    setRunning(true);

    // Fokus na wrapper, żeby strzałki działały od razu
    setTimeout(() => {
      try {
        focusRef.current?.focus();
      } catch {}
    }, 0);
  }, [ROWS, COLS, MAP, startPac, startGhosts]);

  // Sterowanie — klawiatura (globalnie)
  useEffect(() => {
    const onKey = (e) => {
      const s = stateRef.current;
      if (!s) return;
      if (e.key === "ArrowLeft") {
        s.pac.next = { x: -1, y: 0 };
        e.preventDefault();
      } else if (e.key === "ArrowRight") {
        s.pac.next = { x: 1, y: 0 };
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        s.pac.next = { x: 0, y: -1 };
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        s.pac.next = { x: 0, y: 1 };
        e.preventDefault();
      } else if (e.key === " ") {
        setRunning((r) => !r);
        e.preventDefault();
      } else if (e.key === "Escape") {
        onClose?.();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Pętla gry
  useEffect(() => {
    let raf;
    const ctx = canvasRef.current?.getContext("2d");
    function frame() {
      const s = stateRef.current;
      if (!s || !ctx) {
        raf = requestAnimationFrame(frame);
        return;
      }
      const now = performance.now();
      const dt = Math.min(0.05, (now - s.last) / 1000);
      s.last = now;
      if (running) update(s, dt);
      render(ctx, s);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  function align(ent) {
    const cx = Math.round(ent.x - 0.5) + 0.5;
    const cy = Math.round(ent.y - 0.5) + 0.5;
    const ok = Math.abs(ent.x - cx) < 0.1 && Math.abs(ent.y - cy) < 0.1;
    if (ok) {
      ent.x = cx;
      ent.y = cy;
    }
    return ok;
  }

  function update(s, dt) {
    const p = s.pac;

    // zmiana kierunku na środku kafla
    if (align(p)) {
      const tx = Math.round(p.x - 0.5) + p.next.x;
      const ty = Math.round(p.y - 0.5) + p.next.y;
      if (!isWall(tx, ty)) p.dir = { ...p.next };
    }

    // ruch pac-mana
    const tx = Math.round(p.x - 0.5) + p.dir.x;
    const ty = Math.round(p.y - 0.5) + p.dir.y;
    const speed = 7 * dt; // kafelków/sek.
    if (!isWall(tx, ty)) {
      p.x += p.dir.x * speed;
      p.y += p.dir.y * speed;
    } else {
      align(p);
    }

    // zjadanie kropek
    const cx = Math.round(p.x - 0.5),
      cy = Math.round(p.y - 0.5);
    const key = `${cx},${cy}`;
    if (s.dots.has(key)) {
      s.dots.delete(key);
      setScore((sc) => sc + (isPower(cx, cy) ? 50 : 10));
      if (isPower(cx, cy)) s.ghosts.forEach((g) => (g.frightened = 6)); // 6s
      if (s.dots.size === 0) {
        // nowy poziom
        setLevel((l) => l + 1);
        for (let y = 0; y < ROWS; y++)
          for (let x = 0; x < COLS; x++)
            if (MAP[y][x] === "." || MAP[y][x] === "o")
              s.dots.add(`${x},${y}`);
        p.x = startPac.x + 0.5;
        p.y = startPac.y + 0.5;
        p.dir = { x: 1, y: 0 };
        p.next = p.dir;
        s.ghosts.forEach((g, i) => {
          const sg = startGhosts[i % startGhosts.length];
          g.x = sg.x + 0.5;
          g.y = sg.y + 0.5;
          g.dir = { x: 0, y: -1 };
          g.frightened = 0;
        });
      }
    }

    // duchy
    s.ghosts.forEach((g) => {
      if (g.frightened > 0) g.frightened -= dt;
      const centered = align(g);
      const speedG = (g.frightened > 0 ? 5 : 6) * dt;
      if (centered) {
        const dirs = [
          { x: 1, y: 0 },
          { x: -1, y: 0 },
          { x: 0, y: 1 },
          { x: 0, y: -1 },
        ].filter((d) => !(d.x === -g.dir.x && d.y === -g.dir.y));
        const options = dirs.filter(
          (d) => !isWall(Math.round(g.x - 0.5) + d.x, Math.round(g.y - 0.5) + d.y)
        );
        if (options.length) {
          // proste AI: z/od pac-mana według dystansu taksówkowego
          options.sort((a, b) => {
            const ax = Math.abs(g.x + a.x - p.x) + Math.abs(g.y + a.y - p.y);
            const bx = Math.abs(g.x + b.x - p.x) + Math.abs(g.y + b.y - p.y);
            return (g.frightened <= 0 ? ax - bx : bx - ax);
          });
          g.dir = options[0];
        }
      }
      const nx = Math.round(g.x - 0.5) + g.dir.x;
      const ny = Math.round(g.y - 0.5) + g.dir.y;
      if (!isWall(nx, ny)) {
        g.x += g.dir.x * speedG;
        g.y += g.dir.y * speedG;
      }
    });

    // kolizje
    for (const g of s.ghosts) {
      const dx = g.x - p.x,
        dy = g.y - p.y;
      if (dx * dx + dy * dy < 0.2) {
        if (g.frightened > 0) {
          setScore((sc) => sc + 200);
          const sg = startGhosts[0];
          g.x = sg.x + 0.5;
          g.y = sg.y + 0.5;
          g.dir = { x: 0, y: -1 };
          g.frightened = 0;
        } else {
          setLives((v) => {
            const nv = v - 1;
            if (nv <= 0) {
              // reset gry
              s.dots.clear();
              for (let y = 0; y < ROWS; y++)
                for (let x = 0; x < COLS; x++)
                  if (MAP[y][x] === "." || MAP[y][x] === "o")
                    s.dots.add(`${x},${y}`);
              setScore(0);
              setLevel(1);
              return 3;
            }
            return nv;
          });
          p.x = startPac.x + 0.5;
          p.y = startPac.y + 0.5;
          p.dir = { x: 1, y: 0 };
          p.next = p.dir;
          s.ghosts.forEach((gg, i) => {
            const sg = startGhosts[i % startGhosts.length];
            gg.x = sg.x + 0.5;
            gg.y = sg.y + 0.5;
            gg.dir = { x: 0, y: -1 };
            gg.frightened = 0;
          });
          break;
        }
      }
    }
  }

  function render(ctx, s) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const scale = Math.min(
      (wrap.clientWidth - 16) / W,
      (wrap.clientHeight - 120) / H,
      2
    );
    const cw = Math.max(1, Math.floor(W * scale));
    const ch = Math.max(1, Math.floor(H * scale));
    if (
      canvasRef.current.width !== cw ||
      canvasRef.current.height !== ch
    ) {
      canvasRef.current.width = cw;
      canvasRef.current.height = ch;
    }

    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    ctx.scale(scale, scale);

    // tło
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, W, H);

    // mapa + kropki
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = MAP[y][x];
        if (c === "#") {
          ctx.fillStyle = "#1f2937";
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
          ctx.strokeStyle = "#374151";
          ctx.strokeRect(x * TILE + 0.5, y * TILE + 0.5, TILE - 1, TILE - 1);
        }
        const key = `${x},${y}`;
        if (s.dots.has(key)) {
          ctx.fillStyle = c === "o" ? "#fde047" : "#9ca3af";
          ctx.beginPath();
          ctx.arc(
            x * TILE + TILE / 2,
            y * TILE + TILE / 2,
            c === "o" ? 4 : 2.5,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }
    }

    // pac
    const p = s.pac;
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(p.x * TILE, p.y * TILE, TILE * 0.38, 0, Math.PI * 2);
    ctx.fill();

    // duchy
    s.ghosts.forEach((g) => {
      ctx.fillStyle = g.frightened > 0 ? "#60a5fa" : g.color;
      ctx.beginPath();
      ctx.arc(g.x * TILE, g.y * TILE, TILE * 0.36, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  return (
    <div ref={wrapRef} className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-gray-800">
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-1 rounded bg-gray-800 border border-gray-700">
            Score: <b>{score}</b>
          </span>
          <span className="px-2 py-1 rounded bg-gray-800 border border-gray-700">
            Lives: <b>{lives}</b>
          </span>
          <span className="px-2 py-1 rounded bg-gray-800 border border-gray-700">
            Level: <b>{level}</b>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRunning((r) => !r)}
            className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-sm"
          >
            {running ? "Pauza" : "Wznów"}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-sm"
          >
            Zamknij
          </button>
        </div>
      </div>

      <div
        ref={focusRef}
        tabIndex={0}
        className="flex-1 grid place-items-center p-2 outline-none"
      >
        <canvas ref={canvasRef} className="max-w-full max-h-full" />
      </div>

      {/* Sterowanie mobilne */}
      <div className="md:hidden p-3 grid grid-cols-3 gap-2 place-items-center">
        <div />
        <button
          onClick={() => {
            const s = stateRef.current;
            if (s) s.pac.next = { x: 0, y: -1 };
          }}
          className="px-4 py-3 rounded-lg border border-gray-700 bg-gray-800"
        >
          ↑
        </button>
        <div />
        <button
          onClick={() => {
            const s = stateRef.current;
            if (s) s.pac.next = { x: -1, y: 0 };
          }}
          className="px-4 py-3 rounded-lg border border-gray-700 bg-gray-800"
        >
          ←
        </button>
        <div />
        <button
          onClick={() => {
            const s = stateRef.current;
            if (s) s.pac.next = { x: 1, y: 0 };
          }}
          className="px-4 py-3 rounded-lg border border-gray-700 bg-gray-800"
        >
          →
        </button>
        <div />
        <button
          onClick={() => {
            const s = stateRef.current;
            if (s) s.pac.next = { x: 0, y: 1 };
          }}
          className="px-4 py-3 rounded-lg border border-gray-700 bg-gray-800"
        >
          ↓
        </button>
        <div />
      </div>
    </div>
  );
}
