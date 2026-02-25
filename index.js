import 'dotenv/config'

import { Client, GatewayIntentBits } from 'discord.js'
import { Events } from 'discord.js'

import cron from 'node-cron'
import fs from 'node:fs'
import path from 'node:path'

import { dailyColors } from './content/color.js'
import { dailyMessages } from './content/daily.js'
import { sundayMessages } from './content/sunday.js'
import { motivationMessages } from './content/motivation.js'
import { democracyMessages } from './content/democracy.js'
import { startHttpServer } from './server.js'

startHttpServer()

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

const dataDir = path.join(process.cwd(), 'data')
const statePath = path.join(dataDir, 'state.json')

const cooldowns = new Map()
const COOLDOWN_MS = 15_000

function getRandomPaletteColor() {
  return dailyColors[Math.floor(Math.random() * dailyColors.length)]
}

function checkCooldown(userId) {
  const now = Date.now()
  const last = cooldowns.get(userId)

  if (last && now - last < COOLDOWN_MS) {
    const remaining = Math.ceil((COOLDOWN_MS - (now - last)) / 1000)
    return remaining
  }

  cooldowns.set(userId, now)
  return null
}

function ensureState() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir)
  if (!fs.existsSync(statePath)) {
    fs.writeFileSync(statePath, JSON.stringify({ recentDaily: [], recentSunday: [] }, null, 2))
  }
}

function readState() {
  ensureState()
  return JSON.parse(fs.readFileSync(statePath, 'utf-8'))
}

function writeState(state) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2))
}

function pickFromPool(pool, recentKey, maxRecent) {
  const state = readState()
  const recent = state[recentKey] || []

  const available = pool.filter(m => !recent.includes(m))
  const usablePool = available.length ? available : pool
  const selected = usablePool[Math.floor(Math.random() * usablePool.length)]

  const updatedRecent = [...recent, selected].slice(-maxRecent)
  writeState({ ...state, [recentKey]: updatedRecent })

  return selected
}

async function runDailyCycle() {
  await sendDailyMessage()
}

async function sendEmbed(channelId, text, color) {
  const channel = await client.channels.fetch(channelId)
  if (!channel || !channel.isTextBased()) return
  await channel.send({
    embeds: [{
      description: text,
      color
    }]
  })
}

async function sendDailyMessage() {
  const channelId = process.env.CHANNEL_ID
  const msg = pickFromPool(dailyMessages, 'recentDaily', 14)
  await sendEmbed(channelId, msg, getRandomPaletteColor())
}

async function sendSundayMessage() {
  const channelId = process.env.CHANNEL_ID
  const msg = pickFromPool(sundayMessages, 'recentSunday', 8)
  await sendEmbed(channelId, msg, getRandomPaletteColor())
}

/* Command handling */
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return

  try {
    if (interaction.commandName === 'motivation') {

      const remaining = checkCooldown(interaction.user.id)
      if (remaining) {
        return interaction.reply({
          content: `Patiente encore ${remaining}s.`,
          ephemeral: true
        })
      }

      await interaction.deferReply({ ephemeral: false })

      const msg = pickFromPool(motivationMessages, 'recentMotivation', 10)

      await interaction.editReply({
        embeds: [{
          description: msg,
          color: getRandomPaletteColor(),
          footer: { text: `Demandé par ${interaction.user.username}` },
          timestamp: new Date()
        }]
      })

      return
    }

    if (interaction.commandName === 'democracy') {

      const remaining = checkCooldown(interaction.user.id)
      if (remaining) {
        return interaction.reply({
          content: `Patiente encore ${remaining}s.`,
          ephemeral: true
        })
      }

      await interaction.deferReply({ ephemeral: false })

      const msg = pickFromPool(democracyMessages, 'recentDemocracy', 10)

      await interaction.editReply({
        embeds: [{
          description: msg,
          color: getRandomPaletteColor(),
          footer: { text: `Demandé par ${interaction.user.username}` },
          timestamp: new Date()
        }]
      })

      return
    }

    if (interaction.commandName === 'ping') {
      await interaction.reply({ content: 'Opérationnel.', ephemeral: true })
      return
    }

    if (interaction.commandName === 'preview') {
      await interaction.deferReply({ ephemeral: true })
      const msg = pickFromPool(dailyMessages, 'recentDaily', 14)
      await interaction.editReply({
        embeds: [{
          description: msg,
          color: getRandomPaletteColor()
        }]
      })
      return
    }

    if (interaction.commandName === 'send') {
      await interaction.reply({ content: 'Message envoyé.', ephemeral: true })
      await runDailyCycle()
      return
    }

    if (interaction.commandName === 'run') {
      await interaction.reply({ content: 'Cycle déclenché.', ephemeral: true })
      await runDailyCycle()
      return
    }
  } catch (err) {
    console.error('Interaction error:', err)
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: 'Erreur côté bot.' }).catch(() => {})
    } else {
      await interaction.reply({ content: 'Erreur côté bot.', ephemeral: true }).catch(() => {})
    }
  }
})

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`)

  const tz = process.env.TZ || 'Europe/Paris'
  const dailyExpr = process.env.CRON || '0 7 * * *'

  cron.schedule(dailyExpr, () => { runDailyCycle().catch(() => {}) }, { timezone: tz })
  cron.schedule('0 7 * * 0', () => { sendSundayMessage().catch(() => {}) }, { timezone: tz })
})

client.login(process.env.DISCORD_TOKEN)