/**
 * Provided automated testing in React
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

import App from './App.jsx'

const PLACEMENTS = 'A(A1-A5);B(B6-E6);S(H3-J3);'

test('App renders the Battleship title', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /battleship/i })).toBeInTheDocument()
})

function getRequiredSetupField(labelRegex) {
  try {
    return screen.getByLabelText(labelRegex)
  } catch {
    throw new Error(
      [
        'Missing setup form field.',
        'Expected labeled inputs for setup (at minimum):',
        '- "Name"',
        '- "Ship placements"',
      ].join('\n'),
    )
  }
}

async function clickDialogButton(user, nameRegex) {
  const dialog = screen.getByRole('dialog')
  const button = within(dialog).getByRole('button', { name: nameRegex })
  await user.click(button)
}

function requireTurnStartDialog(playerName) {
  const dialog = screen.queryByRole('dialog', { name: new RegExp(`${playerName}.*turn`, 'i') })
  if (dialog) return dialog

  throw new Error(
    [
      'Expected a turn-start overlay (dialog) like:',
      `  "Click OK to begin ${playerName}'s turn"`,
    ].join('\n'),
  )
}

test('Check setup UI (two players)', async () => {
  const user = userEvent.setup()
  render(<App />)

  // Player 1 setup.
  await user.type(getRequiredSetupField(/name/i), 'Alice')
  await user.type(getRequiredSetupField(/ship placements/i), PLACEMENTS)
  await user.click(screen.getByRole('button', { name: /continue/i }))

  // Player 2 setup.
  await user.type(getRequiredSetupField(/name/i), 'Bob')
  await user.type(getRequiredSetupField(/ship placements/i), PLACEMENTS)
  expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument()
})

test('Check turn-based targeting (hover/click) + hit/miss + repeat-shot rejected', async () => {
  const user = userEvent.setup()
  render(<App />)

  // Player 1 setup.
  await user.type(getRequiredSetupField(/name/i), 'Alice')
  await user.type(getRequiredSetupField(/ship placements/i), PLACEMENTS)
  await user.click(screen.getByRole('button', { name: /continue/i }))

  // Player 2 setup.
  await user.type(getRequiredSetupField(/name/i), 'Bob')
  await user.type(getRequiredSetupField(/ship placements/i), PLACEMENTS)
  await user.click(screen.getByRole('button', { name: /start game/i }))

  // Alice turn start.
  requireTurnStartDialog('Alice')
  expect(screen.queryByRole('grid', { name: /alice.*enemy/i })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /^ok$/i }))
  expect(screen.getByRole('heading', { name: /alice.*enemy/i })).toBeInTheDocument()

  // Boards should be 10x10 with labels A-J and 1-10.
  const shipsGrid = screen.getByRole('grid', { name: /alice.*ships/i })
  const enemyGrid = screen.getByRole('grid', { name: /alice.*enemy/i })
  expect(shipsGrid).toHaveTextContent('A')
  expect(shipsGrid).toHaveTextContent('J')
  expect(shipsGrid).toHaveTextContent('1')
  expect(shipsGrid).toHaveTextContent('10')
  expect(enemyGrid).toBeInTheDocument()

  // Enemy grid squares should be clickable buttons and support hover styling via class name.
  const aliceH3 = screen.getByRole('button', { name: /^fire at h3$/i })
  expect(aliceH3).toHaveClass('cell--interactive')

  // Own-grid clicks should do nothing (should not open a result dialog).
  const shipA1 = within(shipsGrid).getByLabelText(/^a1$/i)
  expect(shipA1).toHaveTextContent(/^A$/)
  await user.click(shipA1)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

  // Alice fires at H3 (hit in the provided placement string).
  await user.click(aliceH3)
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(screen.getByRole('dialog')).toHaveTextContent(/hit|miss/i)
  await clickDialogButton(user, /end turn|ok/i)

  // Bob turn start → Bob fires at J1 (miss).
  expect(screen.getByRole('dialog', { name: /bob.*turn/i })).toBeInTheDocument()
  expect(screen.queryByRole('grid', { name: /alice.*enemy/i })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /^ok$/i }))
  await user.click(screen.getByRole('button', { name: /^fire at j1$/i }))
  expect(screen.getByRole('dialog')).toHaveTextContent(/hit|miss/i)
  await clickDialogButton(user, /end turn|ok/i)

  // Alice turn start.
  await user.click(screen.getByRole('button', { name: /^ok$/i }))

  // Repeat-shot rejection (H3 was already fired by Alice).
  const h3Again = screen.getByRole('button', { name: /^fire at h3$/i })
  expect(h3Again).toHaveClass('cell--hit')
  await user.click(h3Again)
  expect(screen.getByRole('dialog', { name: /invalid selection/i })).toBeInTheDocument()
  await clickDialogButton(user, /try again|ok/i)

  // Second hit on the submarine.
  await user.click(screen.getByRole('button', { name: /^fire at i3$/i }))
  expect(screen.getByRole('dialog')).toHaveTextContent(/hit|miss/i)
  await clickDialogButton(user, /end turn|ok/i)

  // Bob makes another miss.
  await user.click(screen.getByRole('button', { name: /^ok$/i }))
  await user.click(screen.getByRole('button', { name: /^fire at j2$/i }))
  expect(screen.getByRole('dialog')).toHaveTextContent(/hit|miss/i)
  await clickDialogButton(user, /end turn|ok/i)

  // Alice sinks the submarine with the third hit.
  await user.click(screen.getByRole('button', { name: /^ok$/i }))
  await user.click(screen.getByRole('button', { name: /^fire at j3$/i }))
  expect(screen.getByRole('dialog')).toHaveTextContent(/sunk/i)
  expect(screen.getByRole('dialog')).toHaveTextContent(/submarine/i)
  await clickDialogButton(user, /end turn|ok/i)

  await user.click(screen.getByRole('button', { name: /^ok$/i }))
})

test('Check game over (winner + both scores shown)', async () => {
  const user = userEvent.setup()
  render(<App />)

  // Setup players.
  await user.type(getRequiredSetupField(/name/i), 'Alice')
  await user.type(getRequiredSetupField(/ship placements/i), PLACEMENTS)
  await user.click(screen.getByRole('button', { name: /continue/i }))
  await user.type(getRequiredSetupField(/name/i), 'Bob')
  await user.type(getRequiredSetupField(/ship placements/i), PLACEMENTS)
  await user.click(screen.getByRole('button', { name: /start game/i }))

  requireTurnStartDialog('Alice')

  const aliceHits = ['H3', 'I3', 'J3', 'B6', 'C6', 'D6', 'E6', 'A1', 'A2', 'A3', 'A4', 'A5']
  const bobMisses = ['J10', 'I10', 'H10', 'G10', 'F10', 'E10', 'D10', 'C10', 'B10', 'A10', 'A9']

  for (let i = 0; i < aliceHits.length; i++) {
    // Alice's turn.
    await user.click(screen.getByRole('button', { name: /^ok$/i }))
    await user.click(screen.getByRole('button', { name: new RegExp(`^fire at ${aliceHits[i]}$`, 'i') }))

    // Final hit should end the game.
    if (i === aliceHits.length - 1) break

    await clickDialogButton(user, /end turn|ok/i)

    // Bob's turn (miss).
    await user.click(screen.getByRole('button', { name: /^ok$/i }))
    await user.click(screen.getByRole('button', { name: new RegExp(`^fire at ${bobMisses[i]}$`, 'i') }))
    await clickDialogButton(user, /end turn|ok/i)
  }

  // End-of-game UI: show winner and both scores (exact wording/layout is flexible).
  expect(screen.getByRole('dialog')).toHaveTextContent(/wins|game over/i)
  await clickDialogButton(user, /show scores|ok|end turn/i)

  expect(screen.getByRole('heading', { name: /game over/i })).toBeInTheDocument()
  expect(screen.getByText(/alice/i)).toBeInTheDocument()
  expect(screen.getByText(/bob/i)).toBeInTheDocument()
})

function listFiles(dir) {
  /** @type {string[]} */
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...listFiles(full))
    else out.push(full)
  }
  return out
}

function stripComments(source) {
  // Heuristic comment removal (good enough for this “no browser dialogs” check).
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
}

describe('spec constraints', () => {
  test('does not use alert() or prompt()', () => {
    const srcDir = path.join(process.cwd(), 'src')
    const files = listFiles(srcDir).filter((f) => {
      if (!/\.(js|jsx)$/.test(f)) return false
      if (/\.test\.(js|jsx)$/.test(f)) return false
      if (f.includes(`${path.sep}spec${path.sep}`)) return false
      if (f.includes(`${path.sep}test${path.sep}`)) return false
      return true
    })

    const banned = [
      { name: 'alert()', pattern: /\balert\s*\(/ },
      { name: 'prompt()', pattern: /\bprompt\s*\(/ },
    ]

    for (const file of files) {
      const text = stripComments(fs.readFileSync(file, 'utf8'))
      for (const rule of banned) {
        expect(text, `${path.relative(process.cwd(), file)} contains ${rule.name}`).not.toMatch(rule.pattern)
      }
    }
  })
})
