require("dotenv").config();

const fs = require("fs");
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

/* ---------------- CONFIG ---------------- */

const STAFF_ROLE = "+ HIGH AUTHORITY";

const COMMUNITY_ROLE_IDS = [
  "1476508063824347207",
  "1488851027779391488",
];

const LOUNGE_CHANNEL_ID = "1453570168994267177";
const ENROLLMENT_CHANNEL_ID = "1453571458092498954";
const EXCLUSIVES_CHANNEL_ID = "1453741376825987204";

const LOCKED_IN_ROLE = "Locked In";
const LOCKED_IN_PLUS_ROLE = "Locked In +";

const LEADS_FILE = "./leads.json";
const STORE_FILE = "./permanentMessage.json";

/* ---------------- HELPERS ---------------- */

function loadJson(file, fallback = {}) {
  if (!fs.existsSync(file)) return fallback;

  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function isStaffMember(member) {
  return member?.roles.cache.some((role) => role.name === STAFF_ROLE);
}

function getRoleByName(guild, roleName) {
  return guild.roles.cache.find((role) => role.name === roleName);
}

/* ---------------- APPLICATION SYSTEM ---------------- */

async function startApplication(user) {
  const leads = loadJson(LEADS_FILE, {});

  if (leads[user.id] && leads[user.id].status !== "closed") {
    return {
      success: false,
      message: "You already have an active application in the system.",
    };
  }

  leads[user.id] = {
    userId: user.id,
    username: user.tag,
    status: "applied",
    tier: null,
    appliedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveJson(LEADS_FILE, leads);

  try {
    await user.send(
`**Exclusive Operations Council — Application**

Answer the following questions with detail.

1. Name, age, and current focus?
2. What are you trying to achieve?
3. What are you currently doing to make money online/resell?
4. Current income level?
5. What is holding you back right now?
6. Why should we accept you into Vault Closed?
7. Are you ready to invest into yourself if accepted?

Once submitted, our team will review your answers.`
    );

    return { success: true, message: "Application sent." };
  } catch {
    return {
      success: false,
      message: "I could not DM you. Please turn on DMs from server members and try again.",
    };
  }
}

/* ---------------- READY ---------------- */

client.once("ready", async () => {
  console.log(`Bot is online as ${client.user.tag}`);
  await sendPermanentEnrollmentMessage();
});

/* ---------------- PERMANENT ENROLLMENT EMBED ---------------- */

async function sendPermanentEnrollmentMessage() {
  const channel = await client.channels.fetch(ENROLLMENT_CHANNEL_ID).catch(() => null);
  if (!channel) return console.log("Enrollment channel not found.");

  const saved = loadJson(STORE_FILE, {});

  if (saved.enrollmentMessageId) {
    try {
      await channel.messages.fetch(saved.enrollmentMessageId);
      console.log("Permanent enrollment message already exists.");
      return;
    } catch {
      console.log("Old enrollment message missing. Sending new one.");
    }
  }

  const embed = new EmbedBuilder()
    .setColor(0xD4AF37)
    .setTitle("Exclusive Operations Council — Enrollment")
    .setDescription(
`Entry into the **Exclusive Operations Council (Vault Closed)** is not open to everyone.

Before anything — understand this:

We are not just a group.
We operate as a **family** built on growth, discipline, execution, and elevation.

Everyone inside is here to win — and we move together.

---

Inside, you gain access to a system designed for **real results**, not surface-level information.

• High-quality, fast-shipping suppliers across multiple categories
• Proven methods, consistent updates, and real-time product opportunities
• Coaches actively generating **$10K–$20K+ months consistently**
• Weekly scheduled calls, live sessions, and structured support
• Direct access to a network of individuals operating at a high level
• A disciplined environment built around accountability, execution, and growth

This is not a casual space.
This is a **controlled environment** built to elevate those who take action.

---

**How to Enroll**

To begin your evaluation, type:

**!apply**

---

**What Happens Next**

1. You will receive a private application directly in your DMs

2. Your responses will be reviewed by our team

3. If selected, you will be offered placement into either:
   • Beginner Mentorship
   • Premium Mentorship

4. Accepted members receive private onboarding and next steps

5. Once confirmed, your access is granted and your position is secured

---

Access is limited.
Standards are high.
Positions are earned — not given.

If you are ready to move differently,
**begin now.**`
    )
    .setFooter({ text: "VaultDebt — Exclusive Operations Council" })
    .setTimestamp();

  const sent = await channel.send({ embeds: [embed] });

  saveJson(STORE_FILE, {
    enrollmentMessageId: sent.id,
  });

  console.log("Permanent enrollment message sent.");
}

/* ---------------- WELCOME SYSTEM ---------------- */

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const hadRole = COMMUNITY_ROLE_IDS.some((id) => oldMember.roles.cache.has(id));
  const hasRole = COMMUNITY_ROLE_IDS.some((id) => newMember.roles.cache.has(id));

  if (!hadRole && hasRole) {
    const channel = newMember.guild.channels.cache.get(LOUNGE_CHANNEL_ID);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0xD4AF37)
      .setTitle("ACCESS GRANTED")
      .setDescription(
`Welcome to **Vault Open**, <@${newMember.id}>.

A growing community built around:
• discipline
• networking
• execution
• elevation

Lock in, stay active, and build with us.

Interested in mentorship access?

Visit <#1453571458092498954> and use:

**!apply**

**Welcome to VaultDebt.**`
      )
      .setImage("attachment://vaultdebtwelcome.png")
      .setFooter({ text: "VaultDebt — Community Access Granted" })
      .setTimestamp();

    await channel.send({
      content: `<@${newMember.id}>`,
      embeds: [embed],
      files: ["./vaultdebtwelcome.png"],
    });
  }
});

/* ---------------- MESSAGE COMMANDS ---------------- */

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();
  const lower = content.toLowerCase();
  const isStaff = isStaffMember(message.member);

  if (lower === "!ping") {
    return message.reply("Pong 🏓");
  }

  if (lower === "!apply") {
    await message.delete().catch(() => null);

    const result = await startApplication(message.author);

    if (!result.success) {
      try {
        await message.author.send(result.message);
      } catch {}
    }

    return;
  }

  if (lower.startsWith("!accept")) {
    if (!isStaff) return message.reply("No permission.");

    const target = message.mentions.members.first();
    const tier = lower.includes("premium") ? "premium" : "beginner";

    if (!target) {
      return message.reply("Usage: `!accept @user beginner` OR `!accept @user premium`");
    }

    const roleName = tier === "premium" ? LOCKED_IN_PLUS_ROLE : LOCKED_IN_ROLE;
    const role = getRoleByName(message.guild, roleName);

    if (!role) return message.reply(`Role not found: ${roleName}`);

    await target.roles.add(role);

    const leads = loadJson(LEADS_FILE, {});
    leads[target.id] = {
      ...(leads[target.id] || {}),
      userId: target.id,
      username: target.user.tag,
      status: "accepted",
      tier,
      updatedAt: new Date().toISOString(),
      acceptedBy: message.author.tag,
    };

    saveJson(LEADS_FILE, leads);

    await target.send(
`Congratulations.

You have been accepted into the **Exclusive Operations Council (Vault Closed)**.

Placement:
**${tier === "premium" ? "Premium Mentorship" : "Beginner Mentorship"}**

A staff member will provide your onboarding and next steps shortly.`
    ).catch(() => null);

    return message.reply(`${target.user.tag} accepted into ${tier} mentorship.`);
  }

  if (lower.startsWith("!decline")) {
    if (!isStaff) return message.reply("No permission.");

    const target = message.mentions.members.first();
    if (!target) return message.reply("Usage: `!decline @user`");

    const leads = loadJson(LEADS_FILE, {});
    leads[target.id] = {
      ...(leads[target.id] || {}),
      userId: target.id,
      username: target.user.tag,
      status: "declined",
      updatedAt: new Date().toISOString(),
      declinedBy: message.author.tag,
    };

    saveJson(LEADS_FILE, leads);

    await target.send(
`Your application for the Exclusive Operations Council has been reviewed.

At this time, we are not moving forward with your placement.

You may apply again in the future.`
    ).catch(() => null);

    return message.reply(`${target.user.tag} has been declined.`);
  }

  if (lower.startsWith("!closelead")) {
    if (!isStaff) return message.reply("No permission.");

    const target = message.mentions.members.first();
    if (!target) return message.reply("Usage: `!closelead @user`");

    const leads = loadJson(LEADS_FILE, {});
    leads[target.id] = {
      ...(leads[target.id] || {}),
      userId: target.id,
      username: target.user.tag,
      status: "closed",
      updatedAt: new Date().toISOString(),
      closedBy: message.author.tag,
    };

    saveJson(LEADS_FILE, leads);

    return message.reply(`${target.user.tag}'s lead has been closed.`);
  }

  if (lower.startsWith("!reopenlead")) {
    if (!isStaff) return message.reply("No permission.");

    const target = message.mentions.members.first();
    if (!target) return message.reply("Usage: `!reopenlead @user`");

    const leads = loadJson(LEADS_FILE, {});
    leads[target.id] = {
      ...(leads[target.id] || {}),
      userId: target.id,
      username: target.user.tag,
      status: "reopened",
      updatedAt: new Date().toISOString(),
      reopenedBy: message.author.tag,
    };

    saveJson(LEADS_FILE, leads);

    return message.reply(`${target.user.tag}'s lead has been reopened.`);
  }

  if (lower === "!leadstats") {
    if (!isStaff) return message.reply("No permission.");

    const leads = loadJson(LEADS_FILE, {});
    const values = Object.values(leads);

    const embed = new EmbedBuilder()
      .setColor(0xD4AF37)
      .setTitle("VaultDebt Lead Stats")
      .setDescription(
`**Total Leads:** ${values.length}

**Applied:** ${values.filter((l) => l.status === "applied").length}
**Accepted:** ${values.filter((l) => l.status === "accepted").length}
**Declined:** ${values.filter((l) => l.status === "declined").length}
**Closed:** ${values.filter((l) => l.status === "closed").length}
**Reopened:** ${values.filter((l) => l.status === "reopened").length}

**Beginner Mentorship:** ${values.filter((l) => l.tier === "beginner").length}
**Premium Mentorship:** ${values.filter((l) => l.tier === "premium").length}`
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  if (lower === "!sendenrollment") {
    if (!isStaff) return message.reply("No permission.");

    const saved = loadJson(STORE_FILE, {});
    delete saved.enrollmentMessageId;
    saveJson(STORE_FILE, saved);

    await sendPermanentEnrollmentMessage();

    return message.reply("Enrollment message sent.");
  }

  if (lower === "!sendexclusives") {
    if (!isStaff) return message.reply("No permission.");

    const exclusivesChannel = message.guild.channels.cache.get(EXCLUSIVES_CHANNEL_ID);
    if (!exclusivesChannel) return message.reply("Exclusives channel not found.");

    const progressionEmbed = new EmbedBuilder()
      .setColor(0xD4AF37)
      .setTitle("🏆 VAULT PROGRESSION SYSTEM")
      .setDescription(
`As Vault continues to grow, we’re officially introducing the Vault progression system.

This system was built to recognize members who are truly active, respected, connected, and making real motion within the community.

These roles are NOT paid for.
They are earned.

━━━━━━━━━━━━━━━━━━━━━━━

🔓 Vault Entry
✅ Vault Certified
🏆 Vault Elite

━━━━━━━━━━━━━━━━━━━━━━━

Progression will be determined by:

• Community activity
• Consistency within the server
• Sales & overall motion
• Verified vouches/reputation
• Helping other members
• Valuable finds/resources
• Professionalism & networking
• Overall contribution to Vault

Higher roles will become increasingly difficult to obtain and may require staff review.

Not everyone will reach Vault Elite.

━━━━━━━━━━━━━━━━━━━━━━━

As members continue progressing within Vault, additional opportunities may become available, including:

• Discounted or sponsored mentorship access
• Private 1-on-1 calls
• Vendor/supplier opportunities
• Exclusive resources & guidance
• Priority opportunities within future Vault projects

The more value you bring to the community, the more opportunities may open over time.

━━━━━━━━━━━━━━━━━━━━━━━

Build your reputation.
Make motion.
Earn your place.

Welcome To The Vault.`
      )
      .setFooter({ text: "VaultDebt — Progression System" })
      .setTimestamp();

    const supporterEmbed = new EmbedBuilder()
      .setColor(0xD4AF37)
      .setTitle("💎 VAULT SUPPORTER PERKS")
      .setDescription(
`Supporting the server helps us continue improving Vault, expanding opportunities, funding future projects/giveaways, and bringing more value back into the community.

Supporters are recognized as members directly helping strengthen the Vault ecosystem.

━━━━━━━━━━━━━━━━━━━━━━━

As a Vault Supporter, you’ll receive:

• Custom supporter role & recognition
• Access to supporter-only channels
• Early access to updates & announcements
• Early insight on upcoming additions/changes
• Exclusive giveaways & opportunities
• Media/picture permissions
• Increased community visibility
• Access to exclusive resources, drops & information

━━━━━━━━━━━━━━━━━━━━━━━

Supporters may also receive:

• Discounts toward future Vault services/projects
• Priority consideration for opportunities
• Early access to select vendors/resources
• Access to supporter-only calls/events
• Early access to future releases

━━━━━━━━━━━━━━━━━━━━━━━

Supporting Vault is more than just boosting a server.

It’s helping build one of the strongest reselling communities possible while positioning yourself closer to future opportunities within the ecosystem.

We appreciate every supporter helping push Vault forward.`
      )
      .setFooter({ text: "VaultDebt — Supporter System" })
      .setTimestamp();

    await exclusivesChannel.send({ embeds: [progressionEmbed] });
    await exclusivesChannel.send({ embeds: [supporterEmbed] });

    return message.reply("Exclusives announcements sent.");
  }

  if (lower.startsWith("!embed ")) {
    if (!isStaff) return message.reply("No permission.");

    const raw = content.slice("!embed ".length);
    const parts = raw.split("|").map((p) => p.trim());

    if (parts.length < 3) {
      return message.reply("Usage: `!embed #channel | Title | Description | #D4AF37`");
    }

    const channelMention = parts[0];
    const title = parts[1];
    const description = parts[2];
    const colorInput = parts[3] || "#D4AF37";

    const match = channelMention.match(/^<#(\d+)>$/);
    if (!match) return message.reply("Mention the channel properly.");

    const channel = message.guild.channels.cache.get(match[1]);
    if (!channel) return message.reply("Channel not found.");

    const color = parseInt(colorInput.replace("#", ""), 16) || 0xD4AF37;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .setFooter({ text: "VaultDebt — Vault Open" })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    return message.reply("Embed sent.");
  }

  if (lower === "!sendrules") {
    if (!isStaff) return message.reply("No permission.");

    const rulesChannel = message.guild.channels.cache.find((c) => c.name === "rules");
    if (!rulesChannel) return message.reply("Rules channel not found.");

    const embed = new EmbedBuilder()
      .setColor(0xD4AF37)
      .setTitle("Vault Open Rules")
      .setDescription(
`Operate with discipline.

No scams.
No nonsense.
No fake proof.
No disrespect.
No leaking private information.
No wasting staff time.

This environment is built for growth, execution, and elevation.`
      )
      .setTimestamp();

    await rulesChannel.send({ embeds: [embed] });
    return message.reply("Rules sent.");
  }
});

/* ---------------- LOGIN ---------------- */

client.login(process.env.TOKEN);