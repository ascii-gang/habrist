import { bot } from "../bot.ts";
import { append, getAll, remove } from "../kv.ts";
import { getFeed } from "../feed.ts";
import { GrammyError } from "../deps.ts";

bot.command("start", async (ctx) => {
  const users = await getAll();
  if (!users.includes(`${ctx.message?.chat.id}`)) {
    append(`${ctx.message?.chat.id}`);
  }

  await ctx.reply(
    "A'zolik qo'shildi.\nYou will be notified when an article is out.",
  );
});

const kv = await Deno.openKv();

if ((await kv.get<string>(["last"])).value == null) {
  await kv.set(["last"], "nah");
}

Deno.cron("send an article", "* * * * *", async () => {
  const feed = await getFeed();
  const last = (await kv.get<string>(["last"])).value;

  const feed_id = feed.id.match(/\d+/g)?.[0];

  if (feed_id != last) {
    await kv.set(["last"], feed_id);

    const users = (await kv.get<string[]>(["users"])).value as string[];
    console.log("Users:", users);
    console.log("Last article: ", last);
    console.log("Feed: ", feed_id);

    const response = `${feed.title?.value}\n\n${
      feed.description?.value?.replace(/<\/?p>/g, "").replace("<br>", "\n")
        .replace(/<img\s+src="[^"]*"\s*\/?>/g, "")
    }\n\n${feed.id}`;

    for (const user of users) {
      try {
        await bot.api.sendMessage(user, response, {
          parse_mode: "HTML",
        });
      } catch (err) {
        console.log(err);
        if (err instanceof GrammyError) {
          console.log(err.description);
          await remove(user);
          console.log("Removed");
        } else {
          console.log("Other error:", err);
        }
      }
    }
  }
});
