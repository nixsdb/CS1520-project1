import { columns } from "./game.js";

function Board({ title, board, shots, target, onFire }) {
    const rows = [];
    for (let row = 1; row <= 10; row++) {
        const cells = [];
        for (const column of columns) {
            const square = column + row;
            let colorClass = "";
            if (shots[square] === "hit") {
                colorClass = "cell--hit";
            }
            if (shots[square] === "miss") {
                colorClass = "cell--miss";
            }
            cells.push(
                <td role="gridcell" key={square}>
                    {target ? (
                        <button
                            type="button"
                            className={`cell cell--interactive ${colorClass}`}
                            aria-label={`Fire at ${square}`}
                            onClick={() => onFire(square)}
                        >
                            {shots[square] === "hit"
                                ? "×"
                                : shots[square] === "miss"
                                    ? "•"
                                    : ""}
                        </button>
                    ) : (
                        <span
                            className={`cell ${colorClass}`}
                            aria-label={square}
                        >
                            {board[square] ||
                                (shots[square] === "miss" ? "•" : "")}
                        </span>
                    )}
                </td>,
            );
        }
        rows.push(
            <tr key={row}>
                <th scope="row">{row}</th>
                {cells}
            </tr>,
        );
    }

    return (
        <section className="board-section">
            <h2>{title}</h2>
            <div className="board-scroll">
                <table role="grid" aria-label={title}>
                    <thead>
                    <tr>
                        <td></td>
                        {Array.from(columns).map((column) => (
                            <th scope="col" key={column}>
                                {column}
                            </th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>{rows}</tbody>
                </table>
            </div>
        </section>
    );
}

export default Board;
