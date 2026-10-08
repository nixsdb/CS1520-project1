export const columns = 'ABCDEFGHIJ'
export const shipNames = {
    A: 'aircraft carrier',
    B: 'battleship',
    S: 'submarine'
}
const shipLengths = {
    A: 5,
    B: 4,
    S: 3
}

export function parsePlacements(text) {
    const board = {}
    const found = []
    const parts = text.toUpperCase().replace(/\s/g, '').split(';')
    if (parts[parts.length - 1] === '') {
        parts.pop()
    }
    if (parts.length !== 3) {
        throw new Error('Enter one carrier (A), battleship (B), and submarine (S).')
    }

    for (const part of parts) {
        const match = part.match(/^([ABS])\(([A-J])(10|[1-9])-([A-J])(10|[1-9])\)$/)
        if (!match) {
            throw new Error('As an example: A(A1-A5);B(B6-E6);S(H3-J3);')
        }
        const ship = match[1]
        const startColumn = columns.indexOf(match[2])
        const startRow = Number(match[3])
        const endColumn = columns.indexOf(match[4])
        const endRow = Number(match[5])
        if (found.includes(ship)) {
            throw new Error('Each ship must appear exactly once.')
        }
        if (startColumn !== endColumn && startRow !== endRow) {
            throw new Error('Ships must be horizontal or vertical.')
        }
        const length = Math.abs(endColumn - startColumn) + Math.abs(endRow - startRow) + 1
        if (length !== shipLengths[ship]) {
            throw new Error(`The ${shipNames[ship]} must use ${shipLengths[ship]} spaces.`)
        }

        // Step from the first coordinate to the last, including both ends.
        const columnStep = Math.sign(endColumn - startColumn)
        const rowStep = Math.sign(endRow - startRow)
        for (let i = 0; i < length; i++) {
            const square = columns[startColumn + i * columnStep] + (startRow + i * rowStep)
            if (board[square]) throw new Error('Ships cannot overlap.')
            board[square] = ship
        }
        found.push(ship)
    }
    return board
}

export function isSunk(board, shots, ship) {
    for (const square in board) {
        if (board[square] === ship && !shots[square]) {
            return false
        }
    }
    return true
}

export function getScore(board, shots) { //not extra deductions, aircraft carrier = -10 because -2x5 LOL
    let score = 24
    for (const square in shots) {
        if (board[square]) {
            score -= 2
        }
    }
    return score
}