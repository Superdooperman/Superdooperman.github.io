#!/usr/bin/env python3
"""Build docs/Radioactive-Rooster-Roadmap.pdf. Helvetica only, so the text stays ASCII."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "Radioactive-Rooster-Roadmap.pdf"

INK = colors.HexColor("#1a120c")
CREAM = colors.HexColor("#f4e6c8")
COMB = colors.HexColor("#8d1d24")
RULE = colors.HexColor("#3a2418")

body = ParagraphStyle(
    "Body",
    fontName="Helvetica",
    fontSize=10,
    leading=13.5,
    textColor=INK,
    spaceAfter=8,
)
small = ParagraphStyle(
    "Small",
    parent=body,
    fontSize=8.5,
    leading=11,
    spaceAfter=2,
)
h1 = ParagraphStyle(
    "H1",
    fontName="Helvetica-Bold",
    fontSize=14,
    leading=18,
    textColor=COMB,
    spaceBefore=12,
    spaceAfter=6,
    keepWithNext=True,
)
h2 = ParagraphStyle(
    "H2",
    fontName="Helvetica-Bold",
    fontSize=11.5,
    leading=14,
    textColor=INK,
    spaceBefore=8,
    spaceAfter=4,
    keepWithNext=True,
)
title = ParagraphStyle(
    "TitleX",
    fontName="Helvetica-Bold",
    fontSize=18,
    leading=22,
    alignment=TA_CENTER,
    textColor=COMB,
    spaceAfter=4,
)
sub = ParagraphStyle(
    "Sub",
    fontName="Helvetica-Oblique",
    fontSize=11,
    leading=14,
    alignment=TA_CENTER,
    textColor=INK,
    spaceAfter=10,
)
th = ParagraphStyle(
    "Th",
    fontName="Helvetica-Bold",
    fontSize=8,
    leading=10,
    textColor=colors.white,
)
td = ParagraphStyle(
    "Td",
    fontName="Helvetica",
    fontSize=8,
    leading=10.5,
    textColor=INK,
)


def P(text, style=body):
    return Paragraph(text, style)


def bullets(items):
    flow = []
    for item in items:
        flow.append(ListItem(P(item, small), leftIndent=8, bulletColor=COMB))
    return ListFlowable(
        flow,
        bulletType="bullet",
        start="circle",
        leftIndent=14,
        bulletFontName="Helvetica",
        bulletFontSize=8,
        spaceBefore=2,
        spaceAfter=8,
    )


def table(headers, rows, widths):
    head = [P(cell, th) for cell in headers]
    data = [head] + [[P(cell, td) for cell in row] for row in rows]
    grid = Table(data, colWidths=widths, repeatRows=1)
    grid.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), COMB),
        ("BACKGROUND", (0, 1), (-1, -1), CREAM),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("GRID", (0, 0), (-1, -1), 0.4, RULE),
    ]))
    return grid


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(COMB)
    canvas.rect(0, 0, letter[0], 0.42 * inch, fill=1, stroke=0)
    canvas.setFillColor(CREAM)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(0.7 * inch, 0.18 * inch, "Radioactive Rooster and the Yolk of Midnight")
    canvas.drawRightString(letter[0] - 0.7 * inch, 0.18 * inch, f"Page {doc.page}")
    canvas.restoreState()


def build():
    story = []
    story.append(P("Radioactive Rooster", title))
    story.append(P("and the Yolk of Midnight", title))
    story.append(P("Episode roadmap, puzzle key, and art slots", sub))
    story.append(P(
        "The Cock Gobbler steals the Atomic Egg that powers his crow. "
        "He has until midnight to cross Cluck County, badly disguised, and stop her "
        "hard-boiling it at the Hot Oil Pavilion. Midnight is a threat, not a timer, "
        "and not a number painted on a clock."
    ))
    story.append(P(
        "One sitting. Three acts, nine rooms, about fourteen puzzles. "
        "Vanilla JS in /home/pibot/radioactive-rooster. Serve it with "
        "python3 -m http.server 8770. No account server, no death, three saves "
        "in localStorage under rr-yolk-saves."
    ))
    story.append(P(
        "Concept drawings in art/concept/ are signed Mike Azzato, Aug 07. "
        "That credit belongs in this document and the README. It is not a title-screen byline."
    ))

    story.append(P("His crow is the call", h1))
    story.append(P(
        "The crow is not a sidekick and not a power-up pose he strikes for its own sake. "
        "It is his rooster call. The Atomic Egg, seated in the belt buckle, is what turns "
        "a wheeze into the trademark. With the egg gone, the call comes out as *pah*."
    ))
    story.append(P(
        "He almost says it on the fence and ruins the disguise: "
        "\"PAH-! Radioactive Rooster, the crow that curdles crime!\" "
        "That blurt is the failed stealth line. It is not the powered call. "
        "Do not treat \"I am the crow that curdles crime\" as the payoff."
    ))
    story.append(P(
        "The real, unbroken PAH-KAW!!! happens once, when the egg is back in his hands "
        "at the pavilion. He is still squatting. The letters fill the screen. "
        "She leaves on the corn-dog cart. He bows from the squat. Standing up can wait."
    ))

    story.append(P("The Cock Gobbler", h1))
    story.append(P(
        "A beautiful femme fatale. Glamorous, poultry-sultry, not a mascot, "
        "and not a love scene. Black gown, red boa, a smile like a posted notice. "
        "She wants the egg hard-boiled at midnight and she wants him to help run the fryer."
    ))
    story.append(P("Gun Crazy, borrowed and turned around", h2))
    story.append(P(
        "The fair is a nod to the 1950 noir Gun Crazy (Joseph H. Lewis). "
        "In the film, Bart Tare meets sharpshooter Annie Laurie Starr at a carnival. "
        "A public skill contest becomes a flirtation. She says she is bad and will not reform. "
        "She pulls him into a crime partnership. A jealous carnival boss, Packett, "
        "sits in the background. The spree ends in death. This episode does not copy "
        "that plot, those names, or any line from the film. There is no shooting match."
    ))
    story.append(table(
        ["Borrowed", "Inverted"],
        [
            ["A night carnival.", "Cluck County fair. No guns, no robbery, no marriage."],
            ["Infatuation at first sight, on the midway stage.", "He is smitten. He still will not join her."],
            ["A public contest as flirtation.", "Ring-toss bottles and a crow-down. The call is only a wheeze."],
            ["She warns that she is bad and will not practice being good.", "The line stays. He does not follow it downhill."],
            ["She offers a criminal partnership: run the fryer, keep the egg.", "He refuses because he is too good, unlike the movie."],
            ["A jealous midway boss.", "A jealous barker. Nobody dies. She escapes alone on the corn-dog cart."],
        ],
        [3.3 * inch, 3.3 * inch],
    ))
    story.append(Spacer(1, 8))
    story.append(P(
        "Winning crow-down lines are sincere, not insults. "
        "The temptation-round win is: \"You're the best-looking trouble this fair ever booked. "
        "The egg still goes home.\""
    ))

    story.append(P("PG-13 rules", h1))
    story.append(bullets([
        "Mildly PG-13. The costume is a giant rooster suit. The wattle can read as a rude joke. The script never names that joke with an anatomical word.",
        "The double meaning lands at most once in a scene. Farmer Peck may say \"medical situation\" once.",
        "No nudity, no sexual acts, no gore. She is glamorous and fully clothed.",
        "Visual humor is the bad disguise: squat on a fence, gut pushed out, cheeks puffed, trying to pass as a yard bird.",
        "References to Monkey Island, Day of the Tentacle, and Fate of Atlantis are about structure and joke density. No copied characters, lines, or puzzles.",
    ]))

    story.append(P("Mask, eyes, and arm feathers", h1))
    story.append(P(
        "Added from your notes. The big white eyes are stuffed onto the suit, like plush toys. "
        "The pupils point in wonky, disagreeing directions, the way googly eyes do. "
        "Those are not his eyes. His real eyes are under the mask, and he sees through "
        "the nostril holes in the beak. The buckle look on the rooftop says so."
    ))
    story.append(P(
        "The red feathers under his arms stay tucked almost all the time. "
        "They snap out when he jumps from a height or glides, then tuck away again, "
        "the way some Spider-Man drawings show webbing under the arms only in those poses. "
        "In this episode the fire-escape drop is that moment. "
        "The full-color concept drawing is a glide, so the feathers in that drawing are right for it. "
        "The squat and the crow should show sleeves. Current placeholders may still show feathers there. "
        "Replace them from art/in/ when you have the drawings. "
        "Say if you also want the feathers to pop when he finally crows. Right now they do not."
    ))

    story.append(P("Still needed from you", h1))
    story.append(P(
        "The game runs on stand-ins and provisional names. Check the boxes when you decide."
    ))
    story.append(bullets([
        "[ ] Costume colors. Working set, from the full-color sheet: green cowl, huge floppy red comb, yellow beak, one view of the stuffed white eyes, human grin under the beak, red wattle, black bodysuit, white gloves, green tail, gold scaled legs and talons, belt. Confirm or correct.",
        "[ ] Catchphrase. \"The crow that curdles crime\" is only the line he blows while hiding. If the real catchphrase is different, send it.",
        "[ ] Secret identity. None is decided. The water tower is keeping a secret he is trying not to say.",
        "[ ] Supporting names, all provisional: Henny, Farmer Peck, DeeJay Cluck, Ned the clerk, the tired gate guard, the jealous barker. Keep or rename each one.",
        "[ ] Villain name on screen. It is The Cock Gobbler. Confirm that spelling and that it may appear on her sash.",
        "[ ] Words to avoid, beyond anatomical words for the wattle.",
        "[ ] Your drawings. Same filenames, dropped in art/in/. See the art bible below and art/MANIFEST.md.",
        "[ ] Music and VO later. Yes, that can be added. Drop mp3s in audio/in/. Until then, cues are a synth and beds stay silent. Hooks already no-op cleanly when the file is missing.",
    ]))

    story.append(P("How you play it", h1))
    story.append(P(
        "Room-node, not a walking engine. Clicking an exit changes the picture. "
        "There is no pathfinding. The default verb is Look. Exits have their own buttons."
    ))
    story.append(table(
        ["Input", "What it does"],
        [
            ["Look at, Talk to, Take, Use, Push", "The verb bar. Keys 1 through 5 select them."],
            ["Click an item, then a spot or another item", "Use. A pending item whose use matches is applied before a go, so a held ribbon on the pavilion exit uses the ribbon."],
            ["Space or Enter", "Advance the caption."],
            ["Esc", "Clear a held item, or close the menu."],
            ["?spots=1 or Menu", "Outline the hotspots. Phone taps use the same buttons."],
        ],
        [2.5 * inch, 4.1 * inch],
    ))
    story.append(Spacer(1, 8))

    story.append(P("Story", h1))
    story.append(P("Act I. The farm. He knows she rehearses.", h2))
    story.append(P(
        "Rooftop coop. A lipstick note in a fried-chicken bucket says she has the egg "
        "and midnight is the hard-boil. He cannot take the fire escape until he has read it. "
        "He pockets a geiger counter (never used up), a spare bulb from the buckle, "
        "and a signed photo. The drop down the escape pops the arm feathers for one caption, "
        "then they tuck. He arrives at the fence ready to talk, not still blushing at the note."
    ))
    story.append(P(
        "Fence line. Use the rail and he squats: gut out, cheeks puffed, a regular rooster "
        "if you are not looking hard. Talk to anyone in that pose and the wheeze intro blows the cover. "
        "He has to squat again. Walk through the henhouse door while squatting and Henny, the bouncer hen, lets him in."
    ))
    story.append(P(
        "Henhouse. Take her monogrammed tasting spoon and a torn fair stub. "
        "The sitting hen will not get up for talk. Use the autograph photo on her. "
        "The photo is consumed. Then take the fat grub she was sitting on. "
        "The geiger clicks on the warm nest. She practiced here."
    ))
    story.append(P(
        "Barn. Use the grub on the goat. The grub is consumed and the goat gives up a blue ribbon. "
        "The ladder to the ribbon is rotten, so the goat is the door. "
        "Farmer Peck has one line about a medical situation and then moves on."
    ))

    story.append(P("Act II. Town. No money, plenty of spoons.", h2))
    story.append(P(
        "General store. Use the spoon on Ned. He knows the monogram, hands over hot sauce, "
        "a hand mirror, and her past-due bill, and keeps the spoon. There is nothing to buy with cash."
    ))
    story.append(P(
        "WKUK. Use the spare bulb on the geiger counter in the inventory. Either order works. "
        "The bulb is consumed. The counter stays, now rigged, and still clicks. "
        "Use the rigged counter on the mail slot. DeeJay Cluck gives up a loudspeaker and a fair map "
        "with a lipstick circle on the Hot Oil Pavilion. The hot sauce is not for the radio station."
    ))
    story.append(P(
        "Fair gate. The torn stub does not impress the guard. Use the hand mirror on him. "
        "While he is distracted, use the prize-rooster cutout: Rooster squats into it and comes away with a stamped pass. "
        "Use the pass on the turnstile. The pass is consumed. The mirror has to survive this room, "
        "because the other way through the pavilion door still needs it later."
    ))

    story.append(P("Act III. The fair. First sight, then a refusal.", h2))
    story.append(P(
        "Midway. Look at or talk to the spotlight stage. He is smitten on sight. "
        "She tells him she is bad, she will not practice being good, and the pavilion is that way. "
        "The barker is jealous and says so. Use the loudspeaker on the bottle booth. "
        "The bottles are standing in for a ring toss until the art is replaced. "
        "The prize is a rubber basket. The loudspeaker is not consumed."
    ))
    story.append(P(
        "Velvet rope. Use the blue ribbon or the past-due bill. Either one opens the pavilion. "
        "Neither item is consumed. Two legal paths, on purpose."
    ))
    story.append(P(
        "Crow-down. Three rounds, no fail state. A wrong answer stays on the same round. "
        "After the third sincere answer the crowd is his, and she throws the switch anyway."
    ))
    story.append(P(
        "The cage. The rubber basket on the fryer is too low, and on the cage it is too high, "
        "until the chain is jogged. Use the mirror on the heat lamp, or tip the hot sauce into the oil. "
        "The sauce is consumed only if you use it. Then use the basket on the cage. "
        "The basket is consumed. The egg is saved. PAH-KAW!!! "
        "She peels out on the corn-dog cart, furious and already writing a sequel. He bows from the squat."
    ))
    story.append(P(
        "Mirror-and-ribbon ending still holds the hot sauce. "
        "Inventory at the bow: geiger counter, torn stub, blue ribbon, hot sauce, hand mirror, "
        "past-due bill, loudspeaker, fair map. "
        "Used up along the way: bulb, photo, spoon, grub, pass, basket. "
        "Bill-and-sauce ending uses up the sauce and still keeps the bill, the mirror, and the ribbon."
    ))

    story.append(P("Cast", h1))
    story.append(table(
        ["Who", "Job in the episode"],
        [
            ["Radioactive Rooster", "Silly, good, no tolerance for evildoers. Disguises badly. Saves the egg."],
            ["The Cock Gobbler", "Femme fatale. Steals the egg. Offers the fryer. Leaves alone."],
            ["Henny", "Provisional. Bouncer hen at the coop door. Fooled only by the squat."],
            ["Farmer Peck", "Provisional. One medical-situation line. Owns the goat and the ribbon."],
            ["Ned", "Provisional. Clerk. Trades the spoon for sauce, mirror, and the bill."],
            ["DeeJay Cluck", "Provisional. WKUK. Wants a crow with a beat. Pays in a horn and a map."],
            ["Gate guard", "Unnamed, tired. The mirror beats the stub."],
            ["Barker", "Unnamed, jealous. Midway. Not named Packett, and not a boss to kill."],
        ],
        [1.7 * inch, 4.9 * inch],
    ))
    story.append(Spacer(1, 8))

    story.append(P("Rooms and puzzles", h1))
    story.append(table(
        ["Room", "Puzzle"],
        [
            ["Rooftop coop", "Read the bucket note or the fire escape will not open. Take geiger, bulb, photo."],
            ["Fence line", "Use the rail to squat. Talking blows it. The henhouse door works only in the squat."],
            ["Henhouse", "Photo on the hen, then take the grub. Spoon and stub are free takes. Geiger clicks on the nest."],
            ["Barn", "Grub on the goat for the ribbon. Do not trust the ladder."],
            ["General store", "Spoon on Ned. Sauce, mirror, bill. Spoon is consumed."],
            ["WKUK", "Bulb on geiger in inventory, either order. Rigged geiger on the mail slot. Speaker and map."],
            ["Fair gate", "Mirror on the guard, cutout while distracted, pass on the turnstile. Stub fails."],
            ["Midway", "Look or talk to the stage. Speaker on the bottles for the basket. Ribbon or bill on the rope."],
            ["Hot Oil Pavilion", "Three sincere crow-down answers. Mirror on the lamp or sauce in the oil. Basket on the cage."],
        ],
        [1.5 * inch, 5.1 * inch],
    ))
    story.append(Spacer(1, 8))
    story.append(P(
        "Nothing you still need is consumed early. The geiger, the stub, the loudspeaker, the map, "
        "and the ribbon all survive a full mirror-path play. The mirror survives until you choose to use it on the lamp."
    ))

    story.append(P("Items", h1))
    story.append(table(
        ["Item", "From", "Used on", "Consumed"],
        [
            ["Geiger counter", "Rooftop crate", "Nest (look), then bulb, then mail slot", "Never"],
            ["Spare bulb", "Buckle", "Geiger, in inventory", "Yes"],
            ["Autograph photo", "Rooftop stack", "Sitting hen", "Yes"],
            ["Tasting spoon", "Henhouse", "Ned", "Yes"],
            ["Torn stub", "Henhouse", "Guard, and it fails", "No"],
            ["Fat grub", "Under the hen", "Goat", "Yes"],
            ["Blue ribbon", "Goat", "Velvet rope (or keep it)", "No"],
            ["Hot sauce", "Ned", "Fryer oil, the other jog", "Only if used"],
            ["Hand mirror", "Ned", "Guard, then heat lamp", "No"],
            ["Past-due bill", "Ned", "Velvet rope (or keep it)", "No"],
            ["Loudspeaker", "WKUK slot", "Bottle booth", "No"],
            ["Fair map", "WKUK slot", "Clue. Lipstick circle.", "No"],
            ["Stamped pass", "Cutout", "Turnstile", "Yes"],
            ["Rubber basket", "Bottle booth", "Cage, after the jog", "Yes"],
        ],
        [1.25 * inch, 1.25 * inch, 2.35 * inch, 1.15 * inch],
    ))
    story.append(Spacer(1, 8))

    story.append(P("Crow-down script", h1))
    story.append(P(
        "She opens. Wrong ids do not advance the round. The win ids are standard, home, and warn."
    ))
    story.append(P("Round 1. \"That wattle is a cry for help, sugar.\"", h2))
    story.append(bullets([
        "mean, wrong: \"Yeah? Your whole act is a cry for help.\" She calls it the cheap kind of brave.",
        "standard, right: \"It's standard issue. Crime doesn't care, and neither do I.\"",
        "flex, wrong: \"I can hide it if I puff my cheeks. Watch.\" She invented puffing.",
    ]))
    story.append(P(
        "Round 2. \"I'm bad. I won't practice being good. Leave the buckle empty and come run the fryer with me. Midnight tastes better with company.\"",
        h2,
    ))
    story.append(bullets([
        "flirt, wrong: \"If I say yes, do I get the boa?\"",
        "join, wrong: \"Maybe crime is just show business with worse hours.\"",
        "home, right: \"You're the best-looking trouble this fair ever booked. The egg still goes home.\"",
    ]))
    story.append(P("Round 3. \"Squat, little peacock. Show them a real rooster. Then give me the yolk.\"", h2))
    story.append(bullets([
        "mock, wrong: \"Only if you squat first, Gobbler.\"",
        "warn, right: \"Folks, step back from the fryer. Please.\" He wheezes and squats. He does not get the real call yet.",
        "hero, wrong: \"PAH-! I am the crow that curdles crime!\" She says that was not even the real call.",
    ]))

    story.append(P("Art bible: file slots", h1))
    story.append(P(
        "Backgrounds are 1280 by 720. Hotspots are fractions of that frame, so a replacement "
        "should keep the spoon, the goat, the rope, and the rest near where they are, "
        "or the boxes in data/script.js move with them. Do not paint him into the plates. "
        "NPCs may be painted in. He is a portrait plus sprite-squat.png and sprite-crow.png."
    ))
    story.append(table(
        ["Filename", "Slot"],
        [
            ["bg-title.jpg", "Title plate. Words are HTML under the image."],
            ["bg-hq.jpg", "Rooftop coop. Bucket, buckle, bulb, crate, photos, neon, tower, fire escape."],
            ["bg-fence.jpg", "Fence. Birds, rail, Henny, henhouse door, paths."],
            ["bg-henhouse.jpg", "Spoon, stub, warm nest, hen, grub."],
            ["bg-barn.jpg", "Goat, ribbon, rotten ladder, Peck."],
            ["bg-store.jpg", "Ned, bell, jars."],
            ["bg-wkuk.jpg", "Mail slot, DeeJay, on-air light, horn."],
            ["bg-gate.jpg", "Guard, cutout, turnstile."],
            ["bg-midway.jpg", "Bottles, barker, stage, clock, velvet rope. Clock is not 11:41."],
            ["bg-pavilion.jpg", "Gobbler, fryer, cage, heat lamp, crowd, corn-dog cart."],
            ["portrait-rooster.png", "Talk bust. Googly stuffed eyes, wonky pupils."],
            ["portrait-rooster-embarrassed.png", "Blown cover, and the bucket."],
            ["portrait-rooster-smitten.png", "First sight. Not heart-shaped eyes."],
            ["portrait-rooster-crow.png", "The real call."],
            ["sprite-squat.png", "Fence, cutout, ending bow. Feathers tucked."],
            ["sprite-crow.png", "Payoff flash. Feathers tucked unless you change that."],
            ["portrait-gobbler.png", "Her card. One face, used everywhere."],
            ["portrait-henny.jpg and the other NPC crops", "Henny, Peck, clerk, DeeJay, guard, barker."],
            ["item-*.svg", "Fourteen inventory icons. Names match the item ids."],
        ],
        [2.5 * inch, 4.1 * inch],
    ))
    story.append(Spacer(1, 8))
    story.append(P(
        "Known stand-in problems are listed in art/MANIFEST.md. Short version: "
        "some sign lettering is mush, the gate cutout invents a name (Roy), "
        "the midway bottles are not ring-toss pins, her face does not match across plates, "
        "the smitten bust has heart eyes, and the squat is rounder than the concept sheet. "
        "Those stay until your file in art/in/ replaces them. The game does not load cast-sheet.jpg."
    ))

    story.append(P("How to swap a piece of art", h1))
    story.append(P(
        "Leave art/placeholders/ alone if you can. Copy the finished file into art/in/ "
        "with the same filename. The page shows the placeholder at once, then upgrades "
        "when art/in/ answers. Character PNGs should already have a transparent background. "
        "Concept drawings stay in art/concept/. Do not edit the signed painted bust. "
        "The full-color body is the costume reference."
    ))
    story.append(P(
        "Audio works the same way, in audio/in/. Cues: wheeze.mp3, geiger.mp3, click.mp3, "
        "blip.mp3, pah-kaw.mp3. Beds, looped at volume 0.35: bed- and then the room id, "
        "bed-hq.mp3 through bed-pavilion.mp3. No title bed. A missing cue uses the synth. "
        "A missing bed stays silent."
    ))

    story.append(P("Out of scope for this episode", h1))
    story.append(bullets([
        "Walking, pathfinding, and a world map.",
        "Full music and VO right now. The hooks are in. The recordings are later, and they are in scope when you have them.",
        "Episode 2 as a playable game.",
        "Death, restore-from-death, and a scoreboard.",
        "A second engine. This is one folder of HTML, CSS, and ES modules.",
    ]))

    story.append(P("Later episodes, not built", h1))
    story.append(P(
        "Episode 2. She opens a restaurant in the water tower. The secret he would not say "
        "on the tower becomes the dining room. He is still too good to take a cut, "
        "and the googly eyes are still looking at the wrong customer."
    ))
    story.append(P(
        "Episode 3. A fried moon over the fair. She tries the hard-boil on something "
        "that is not an egg. He still gets one real PAH-KAW, and only when the thing "
        "that powers it is actually saved."
    ))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=letter,
        leftMargin=0.7 * inch,
        rightMargin=0.7 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.65 * inch,
        title="Radioactive Rooster and the Yolk of Midnight",
        author="Radioactive Rooster roadmap",
    )
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(OUT)


if __name__ == "__main__":
    build()
