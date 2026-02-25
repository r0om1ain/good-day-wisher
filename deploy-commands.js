import 'dotenv/config'
import { REST, Routes } from 'discord.js'

const commands = [
  { name: 'ping', description: 'Test du bot.' },
  { name: 'send', description: 'Envoie immédiatement le message du jour.' },
  { name: 'preview', description: 'Prévisualise un message sans l’envoyer.' },
  { name: 'motivation', description: 'Reçoit une phrase d’encouragement.' },
  { name: 'democracy', description: 'For Super-Earth !' }
]

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN)

await rest.put(
  Routes.applicationCommands(process.env.CLIENT_ID),
  { body: commands }
)

console.log('Commands deployed.')