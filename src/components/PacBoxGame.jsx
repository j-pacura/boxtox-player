import React, { useEffect, useRef, useState } from "react";

/**
 * Pac-BOX (grid/tick) — działa jak w Twoim przykładzie:
 * - ruch co "tik" (MOVE_DELAY),
 * - sterowanie: strzałki / WASD, spacja (pauza), Esc (zamknij modal jeśli podano onClose),
 * - duchy z prostą losową AI,
 * - power-dot (o): duszki stają się "zjadliwe",
 * - NOWOŚĆ: gdy zjesz wszystkie kropki -> next level (szybciej),
 * - NOWOŚĆ: rysowanie Pac-Mana jako żółtej "buźki" z animowanymi ustami.
 */

export default function PacBoxGame({ onClose }) {
  const canvasRef = useRef(null);
  const gameStateRef = useRef(null);
  const animRef = useRef(null);
  const keysRef = useRef({});
  const lastTickRef = useRef(0);
  const moveDelayRef = useRef(150); // ms między ruchami (będzie maleć na kolejnych poziomach)
  const ghostTurnChanceRef = useRef(0.3); // szansa na zmianę kierunku w tiku
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
  const CELL = 20;
  const W = MAP[0].length * CELL;
  const H = MAP.length * CELL;

  // pomocnicze
  const inBounds = (x, y) => x >= 0 && x < MAP[0].length && y >= 0 && y < MAP.length;
  const isWall = (x, y) => !inBounds(x, y) || MAP[y][x] === "#";

  // znajdź starty
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
    while (arr.length < 4) arr.push(arr[0]); // uzupełnij do 4
    return arr.slice(0, 4);
  }

  function buildDots() {
    const dots = new Set();
    for (let y = 0; y < MAP.length; y++) {
      for (let x = 0; x < MAP[y].length; x++) {
        if (MAP[y][x] === "." || MAP[y][x] === "o") dots.add(`${x},${y}`);
      }
    }
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
      { x: gs[0].x, y: gs[0].y, dir: { x: 1, y: 0 }, color: "#ff0000" },
      { x: gs[1].x, y: gs[1].y, dir: { x: -1, y: 0 }, color: "#00ffff" },
      { x: gs[2].x, y: gs[2].y, dir: { x: 0, y: -1 }, color: "#ffb8ff" },
      { x: gs[3].x, y: gs[3].y, dir: { x: 0, y: 1 }, color: "#ffb852" },
    ];
  }

  // INIT
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
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

  // Sterowanie
  useEffect(() => {
    const onDown = (e) => {
      keysRef.current[e.key] = true;
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
          if (onClose) onClose();
          e.preventDefault();
          break;
      }
    };
    const onUp = (e) => { keysRef.current[e.key] = false; };
    window.addEventListener("keydown", onDown, { passive: false });
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [onClose]);

  // Pomocnicze
  const canMove = (x, y, d) => !isWall(x + d.x, y + d.y);

  function nextLevel() {
    const s = gameStateRef.current;
    if (!s) return;
    setLevel((l) => l + 1);
    // przyspiesz grę z limitem
    moveDelayRef.current = Math.max(70, Math.floor(moveDelayRef.current * 0.92));
    ghostTurnChanceRef.current = Math.min(0.5, ghostTurnChanceRef.current + 0.02);
    s.dots = buildDots();
    s.power = 0;
    resetPositions(s);
    // mały bonus
    setScore((sc) => sc + 100);
    lastTickRef.current = performance.now();
  }

  function loseLife() {
    setLives((lv) => {
      const nv = lv - 1;
      if (nv <= 0) {
        // game over -> reset pełny
        const s = gameStateRef.current;
        if (!s) return 3;
        setScore(0);
        setLevel(1);
        moveDelayRef.current = 150;
        ghostTurnChanceRef.current = 0.3;
        s.dots = buildDots();
        s.power = 0;
        resetPositions(s);
        return 3;
      }
      // reset pozycji
      const s = gameStateRef.current;
      if (s) {
        s.power = 0;
        resetPositions(s);
      }
      return nv;
    });
    lastTickRef.current = performance.now();
  }

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

      // logika co "tik"
      if (runningRef.current && ts - lastTickRef.current >= moveDelayRef.current) {
        lastTickRef.current = ts;

        // kierunek Pac-Mana
        if (canMove(s.pacman.x, s.pacman.y, s.pacman.next)) {
          s.pacman.dir = { ...s.pacman.next };
        }
        if (canMove(s.pacman.x, s.pacman.y, s.pacman.dir)) {
          s.pacman.x += s.pacman.dir.x;
          s.pacman.y += s.pacman.dir.y;

          const key = `${s.pacman.x},${s.pacman.y}`;
          if (s.dots.has(key)) {
            s.dots.delete(key);
            if (MAP[s.pacman.y][s.pacman.x] === "o") {
              setScore((v) => v + 50);
              s.power = 100; // ~100 tików
            } else {
              setScore((v) => v + 10);
            }
            // sprawdź wyczyszczenie planszy
            if (s.dots.size === 0) nextLevel();
          }
        }

        // Ruch duchów (prosta AI: losowa zmiana kierunku z prawdopodobieństwem)
        s.ghosts.forEach((g) => {
          const moves = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
          ].filter((d) => canMove(g.x, g.y, d));

          if (moves.length) {
            // unikaj natychmiastowego zawracania chyba, że brak opcji
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

        // Kolizje
        for (const g of s.ghosts) {
          if (g.x === s.pacman.x && g.y === s.pacman.y) {
            if (s.power > 0) {
              setScore((v) => v + 200);
              // odsyłamy ducha na "spawn" (pierwszy G na mapie)
              const spawns = findGhostStarts();
              const home = spawns[0];
              g.x = home.x; g.y = home.y; g.dir = { x: 0, y: -1 };
            } else {
              loseLife();
              break;
            }
          }
        }

        if (s.power > 0) s.power -= 1;
      }

      // Rysowanie
      // tło
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      // ściany
      for (let y = 0; y < MAP.length; y++) {
        for (let x = 0; x < MAP[y].length; x++) {
          if (MAP[y][x] === "#") {
            ctx.fillStyle = "#1f3bff"; // niebieskie bloki
            ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
          }
        }
      }

      // kropki
      s.dots.forEach((key) => {
        const [x, y] = key.split(",").map(Number);
        const large = MAP[y][x] === "o";
        ctx.fillStyle = large ? "#ffd166" : "#ffee58";
        ctx.beginPath();
        ctx.arc(
          x * CELL + CELL / 2,
          y * CELL + CELL / 2,
          large ? 5 : 2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });

      // Pac-Man — żółta buźka z ustami (animacja)
      const p = gameStateRef.current.pacman;
      const heading =
        p.dir.x === 1 ? 0 :
        p.dir.x === -1 ? Math.PI :
        p.dir.y === -1 ? -Math.PI / 2 :
        Math.PI / 2;

      const t = ts / 1000;
      const mouth = 0.15 + 0.20 * Math.abs(Math.sin(t * 6)); // 0.15..0.35 rad

      ctx.fillStyle = "#ffeb3b";
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

      // Duchy
      for (const g of gameStateRef.current.ghosts) {
        ctx.fillStyle = gameStateRef.current.power > 0 ? "#4ea1ff" : g.color;
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

  // Przyciski
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-gray-800">
        <div className="flex items-center gap-4 text-sm">
          <span className="px-2 py-1 rounded bg-gray-800 border border-gray-700">
            Score: <b>{score}</b>
          </span>
          <span className="px-2 py-1 rounded bg-gray-800 border border-gray-700">
            Lives: <b>{lives}</b>
          </span>
          <span className="px-2 py-1 rounded bg-gray-800 border border-gray-700">
            Level: <b>{level}</b>
          </span>
          <span className={running ? "text-green-400" : "text-red-400"}>
            {running ? "RUNNING" : "PAUSED"}
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
            onClick={restart}
            className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-sm"
          >
            Restart
          </button>
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-sm"
          >
            Zamknij
          </button>
        </div>
      </div>

      <div className="flex-1 grid place-items-center p-3">
        <canvas
          ref={canvasRef}
          className="border border-gray-700 bg-black w-full max-w-full"
          style={{ imageRendering: "pixelated" }}
          tabIndex={0}
        />
      </div>

      {/* Mobile controls */}
      <div className="md:hidden p-3 grid grid-cols-3 gap-2 place-items-center border-t border-gray-800">
        <div />
        <button
          onTouchStart={() => { const s = gameStateRef.current; if (s) s.pacman.next = { x: 0, y: -1 }; }}
          className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center text-xl"
        >
          ↑
        </button>
        <div />

        <button
          onTouchStart={() => { const s = gameStateRef.current; if (s) s.pacman.next = { x: -1, y: 0 }; }}
          className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center text-xl"
        >
          ←
        </button>
        <div />
        <button
          onTouchStart={() => { const s = gameStateRef.current; if (s) s.pacman.next = { x: 1, y: 0 }; }}
          className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center text-xl"
        >
          →
        </button>

        <div />
        <button
          onTouchStart={() => { const s = gameStateRef.current; if (s) s.pacman.next = { x: 0, y: 1 }; }}
          className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center text-xl"
        >
          ↓
        </button>
        <div />
      </div>
    </div>
  );
}
