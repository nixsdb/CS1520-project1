import { useState } from "react";

import Board from "./Board.jsx";
import { parsePlacements, isSunk, getScore, shipNames } from "./game.js";
import "./App.css";

function App() {
    const [players, setPlayers] = useState([]);
    const [name, setName] = useState("");
    const [placements, setPlacements] = useState("");
    const [error, setError] = useState("");
    const [phase, setPhase] = useState("setup");
    const [currentPlayer, setCurrentPlayer] = useState(0);
    const [shots, setShots] = useState([{}, {}]); // each entry stores that player's outgoing shots
    const [message, setMessage] = useState(null);
    const opponent = 1 - currentPlayer;

    function submitSetup(event) {
        event.preventDefault();
        if (!name.trim()) {
            setError("Please enter your name:");
            return;
        }
        try {
            const board = parsePlacements(placements);
            setPlayers([...players, { name: name.trim(), board }]);
            setName("");
            setPlacements("");
            setError("");
            if (players.length === 1) {
                setPhase("handoff");
            }
        } catch (problem) {
            setError(problem.message);
        }
    }

    function fire(square) {
        if (phase !== "play" || message) {
            return;
        }
        if (shots[currentPlayer][square]) {
            setMessage({
                title: "Invalid selection",
                text: "You already fired at that square!",
                kind: "invalid",
            });
            return;
        }
        const enemyBoard = players[opponent].board;
        const ship = enemyBoard[square];
        const newShots = {
            ...shots[currentPlayer],
            [square]: ship ? "hit" : "miss",
        };
        const updatedShots = [...shots];
        updatedShots[currentPlayer] = newShots;
        setShots(updatedShots);

        let text = `${square}: Miss!`;
        if (ship) {
            text = `${square}: Hit!`;
            if (isSunk(enemyBoard, newShots, ship)) {
                text += ` You sunk the ${shipNames[ship]}!`;
            }
        }
        const won =
            isSunk(enemyBoard, newShots, "A") &&
            isSunk(enemyBoard, newShots, "B") &&
            isSunk(enemyBoard, newShots, "S");
        if (won) {
            setMessage({
                title: `${players[currentPlayer].name} wins!`,
                text,
                kind: "win",
            });
        } else {
            setMessage({ title: "Shot result", text, kind: "shot" });
        }
    }

    function closeMessage() {
        if (message.kind === "win") {
            setPhase("over");
        }
        if (message.kind === "shot") {
            setCurrentPlayer(opponent);
            setPhase("handoff");
        }
        setMessage(null);
    }

    function restart() {
        setPlayers([]);
        setShots([{}, {}]);
        setCurrentPlayer(0);
        setMessage(null);
        setPhase("setup");
    }

    return (
        <main>
            <h1>Battleship</h1>
            {phase === "setup" && (
                <section className="setup">
                    <h2>Player {players.length + 1} setup</h2>
                    <p>
                        Place a carrier (5 spaces), battleship (4), and
                        submarine (3).
                    </p>
                    <p>
                        Use columns A–J and rows 1–10. Ships must be straight
                        and cannot overlap.
                    </p>
                    <form onSubmit={submitSetup}>
                        <label htmlFor="name">Name</label>
                        <input
                            id="name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            autoComplete="off"
                            required
                        />
                        <label htmlFor="placements">Ship placements</label>
                        <input
                            id="placements"
                            value={placements}
                            onChange={(event) =>
                                setPlacements(event.target.value)
                            }
                            aria-describedby="placement-example"
                            autoComplete="off"
                            spellCheck="false"
                            required
                        />
                        <p id="placement-example">
                            Example: <code>A(A1-A5);B(B6-E6);S(H3-J3);</code>
                        </p>
                        {error && (
                            <p role="alert" className="error">
                                {error}
                            </p>
                        )}
                        <button type="submit">
                            {players.length === 0 ? "Continue" : "Start game"}
                        </button>
                    </form>
                    <p>
                        Keep placements private. Pass the computer to player{" "}
                        {players.length === 0
                            ? "2 after clicking Continue"
                            : "1 after clicking Start game"}
                        .
                    </p>
                </section>
            )}
            {phase === "handoff" && (
                <div className="overlay">
                    <section
                        className="dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="turn-title"
                    >
                        <h2 id="turn-title">
                            Click OK to begin {players[currentPlayer].name}
                            &apos;s turn
                        </h2>
                        <p>
                            Pass the computer to this player before continuing.
                        </p>
                        <button autoFocus onClick={() => setPhase("play")}>
                            OK
                        </button>
                    </section>
                </div>
            )}
            {phase === "play" && (
                <div inert={message ? true : undefined}>
                    <p className="instructions">
                        {players[currentPlayer].name}, click a square on the
                        enemy grid to fire.
                    </p>
                    <p className="legend">
                        Light blue: unknown · Red / ×: hit · White / •: miss
                    </p>
                    <div className="boards">
                        <Board
                            title={`${players[currentPlayer].name}'s ships`}
                            board={players[currentPlayer].board}
                            shots={shots[opponent]}
                        />
                        <Board
                            title={`${players[currentPlayer].name}'s enemy grid`}
                            board={{}}
                            shots={shots[currentPlayer]}
                            target
                            onFire={fire}
                        />
                    </div>
                </div>
            )}
            {message && (
                <div className="overlay">
                    <section
                        className="dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="message-title"
                    >
                        <h2 id="message-title">{message.title}</h2>
                        <p>{message.text}</p>
                        <button autoFocus onClick={closeMessage}>
                            {message.kind === "invalid"
                                ? "Try again"
                                : message.kind === "win"
                                    ? "Show scores"
                                    : "End turn"}
                        </button>
                    </section>
                </div>
            )}
            {phase === "over" && (
                <section className="results">
                    <h2>Game Over!</h2>
                    <p>
                        The winner is marked below. Score = 24 − (2 * hits
                        received).
                    </p>
                    <table className="scores">
                        <thead>
                        <tr>
                            <th>Player</th>
                            <th>Score</th>
                            <th>Result</th>
                        </tr>
                        </thead>
                        <tbody>
                        {players.map((player, index) => (
                            <tr key={index}>
                                <td>{player.name}</td>
                                <td>
                                    {getScore(
                                        player.board,
                                        shots[1 - index],
                                    )}
                                </td>
                                <td>
                                    {index === currentPlayer
                                        ? "Winner"
                                        : "All ships sunk"}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    <button onClick={restart}>Play again</button>
                </section>
            )}
        </main>
    );
}

export default App;
