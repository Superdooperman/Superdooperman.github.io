from lib import Canvas


def portrait_bg(cv, tint="n2"):
    cv.vgrad(0, 0, 64, 64, "n1", tint)
    cv.oval(36, 4, 22, 22, "moon2")
    cv.oval(38, 5, 19, 19, "moon")
    cv.dither(36, 4, 22, 22, "n3", 3)


def googly(cv, x, y, look, heart=False):
    cv.oval(x, y, 15, 15, "w1", "k")
    cv.oval(x + 2, y + 2, 11, 11, None, "w2")
    cv.px(x + 4, y + 3, "w1")
    if heart:
        hx, hy = x + 4, y + 4
        for (i, j) in [(1, 0), (2, 0), (4, 0), (5, 0), (0, 1), (1, 1), (2, 1), (3, 1), (4, 1), (5, 1), (6, 1),
                       (0, 2), (1, 2), (2, 2), (3, 2), (4, 2), (5, 2), (6, 2), (1, 3), (2, 3), (3, 3), (4, 3), (5, 3),
                       (2, 4), (3, 4), (4, 4), (3, 5)]:
            cv.px(hx + i, hy + j, "r3")
        return
    dx, dy = look
    cv.oval(x + 5 + dx, y + 5 + dy, 5, 5, "k")
    cv.px(x + 6 + dx, y + 6 + dy, "w2")


def rooster_portrait(mood="talk"):
    cv = Canvas(64, 64)
    portrait_bg(cv, "r1" if mood == "crow" else "n2")
    # trench coat shoulders + collar
    cv.poly([(0, 64), (4, 50), (20, 44), (44, 44), (60, 50), (64, 64)], "br3", "k")
    cv.poly([(18, 45), (26, 64), (14, 64), (8, 50)], "br4", "k")
    cv.poly([(46, 45), (38, 64), (50, 64), (56, 50)], "br4", "k")
    cv.poly([(26, 46), (38, 46), (34, 64), (30, 64)], "k")  # dark shirt
    # green neck / cowl
    cv.rect(24, 38, 16, 9, "g2")
    cv.dither(24, 38, 16, 9, "g1", 6)
    # comb
    cv.poly([(16, 16), (14, 6), (21, 10), (22, 0), (29, 7), (34, 0), (37, 8), (44, 3), (43, 12), (48, 16)], "r2", "k")
    cv.poly([(20, 14), (21, 11), (25, 9), (29, 10), (33, 6), (36, 11), (41, 9), (42, 14)], "or")
    cv.line([(23, 4), (24, 9)], "r3"); cv.line([(34, 3), (35, 8)], "r3")
    # head (green hood)
    cv.oval(14, 12, 36, 32, "g2", "k")
    cv.oval(17, 14, 22, 16, "g3")
    cv.dither(14, 30, 36, 14, "g1", 7)
    # googly eyes, wonky
    looks = {"talk": ((-3, 2), (3, -3)), "embarrassed": ((3, 3), (3, 2)), "crow": ((-2, -3), (3, 1)), "smitten": ((0, 0), (0, 0))}[mood]
    googly(cv, 9, 12, looks[0], heart=mood == "smitten")
    googly(cv, 38, 11, looks[1], heart=mood == "smitten")
    # beak with nostril holes (he sees through them)
    if mood == "crow":
        cv.poly([(24, 27), (44, 25), (54, 30), (40, 31), (26, 32)], "y2", "k")
        cv.poly([(26, 35), (40, 34), (50, 41), (38, 42), (27, 38)], "y1", "k")
        cv.poly([(28, 32), (40, 31), (48, 36), (39, 34)], "r1")
    else:
        cv.poly([(24, 26), (42, 24), (53, 31), (44, 35), (26, 34)], "y2", "k")
        cv.line([(27, 31), (47, 32)], "y1")
        if mood == "talk":
            cv.poly([(28, 33), (44, 34), (40, 37), (29, 36)], "y1", "k")
    cv.rect(31, 27, 3, 2, "k")
    cv.rect(37, 26, 3, 2, "k")
    cv.px(32, 27, "w3")
    cv.px(38, 26, "w3")
    # wattle
    cv.oval(24, 34, 7, 10, "r2", "k")
    cv.px(26, 36, "r3")
    if mood in ("embarrassed", "smitten"):
        cv.dither(15, 30, 9, 5, "pk", 8)
        cv.dither(44, 29, 6, 5, "pk", 8)
    if mood == "embarrassed":
        cv.poly([(52, 16), (55, 22), (52, 24), (49, 22)], "b3", "w1")
    if mood == "crow":
        for i, (x, y) in enumerate([(56, 22), (58, 30), (56, 38)]):
            cv.line([(x, y), (x + 5, y + (i - 1) * 2)], "y3")
    return cv


def gobbler_portrait():
    cv = Canvas(64, 64)
    cv.vgrad(0, 0, 64, 64, "n2", "r1")
    cv.oval(36, 1, 26, 26, "moon2")
    cv.oval(38, 2, 23, 23, "moon")
    for (x, y) in [(59, 28), (60, 24), (58, 20), (59, 16), (61, 12), (60, 8)]:
        cv.px(x, y, "w2"); cv.px(x + 1, y - 1, "w3")
    # dark feathered wing-cape behind the shoulders
    cv.poly([(0, 64), (0, 36), (6, 28), (14, 34), (12, 50), (18, 64)], "n1", "k")
    cv.poly([(64, 64), (64, 42), (56, 36), (50, 50), (48, 64)], "n1", "k")
    for i in range(5):
        cv.line([(1, 40 + i * 4), (9, 36 + i * 4)], "n4")
        cv.line([(63, 46 + i * 4), (55, 42 + i * 4)], "n4")
    # hair: long dark waves down to the shoulders
    cv.poly([(16, 52), (13, 30), (17, 14), (28, 7), (40, 8), (48, 16), (50, 32), (48, 50), (42, 44), (24, 44)], "br1", "k")
    for (x1, y1, x2, y2) in [(16, 20, 15, 46), (19, 14, 18, 40), (46, 18, 47, 44), (43, 13, 45, 38)]:
        cv.line([(x1, y1), (x2, y2)], "r1")
    # bare shoulders and slender neck
    cv.poly([(14, 64), (18, 54), (27, 49), (28, 42), (36, 42), (37, 49), (46, 54), (50, 64)], "sk", "k")
    cv.line([(28, 46), (31, 48)], "sk2")
    # strapless black gown
    cv.poly([(16, 64), (19, 58), (32, 60), (45, 58), (48, 64)], "k")
    # face: narrow, pointed chin
    cv.poly([(22, 22), (26, 15), (38, 15), (42, 22), (41, 34), (36, 42), (32, 44), (28, 42), (23, 34)], "sk", "k")
    cv.line([(24, 34), (29, 41)], "sk2")
    # hawk feather mask over the eyes, golden-brown, flaring up and out
    cv.poly([(18, 24), (24, 19), (32, 21), (40, 19), (46, 24), (42, 30), (35, 29), (32, 31), (29, 29), (22, 30)], "br4", "k")
    cv.dither(18, 19, 28, 5, "br5", 6)
    for (x1, y1, x2, y2, x3) in [(18, 24, 9, 11, 22), (21, 21, 15, 6, 25), (43, 21, 49, 6, 39), (46, 24, 55, 11, 42)]:
        cv.poly([(x1, y1), (x2, y2), (x3, y1 - 1)], "br3", "k")
    cv.line([(19, 26), (24, 24)], "y1"); cv.line([(40, 24), (45, 26)], "y1")
    # eyes with lashes, green
    cv.oval(23, 23, 7, 4, "w1", "k"); cv.rect(26, 24, 2, 2, "g2")
    cv.oval(34, 23, 7, 4, "w1", "k"); cv.rect(36, 24, 2, 2, "g2")
    cv.line([(22, 22), (24, 21)], "k"); cv.line([(40, 21), (42, 22)], "k")
    # hooked yellow beak down the nose
    cv.poly([(30, 26), (34, 26), (36, 32), (34, 36), (32, 34), (31, 31)], "y2", "k")
    cv.px(33, 27, "y3"); cv.px(33, 35, "y1")
    # red lips
    cv.poly([(28, 38), (31, 37), (32, 38), (33, 37), (36, 38), (33, 40), (30, 40)], "r2", "k")
    cv.line([(29, 38), (35, 38)], "r1"); cv.px(31, 39, "r3")
    # black opera glove with gold cuff and a cigarette holder
    cv.poly([(47, 64), (50, 50), (54, 40), (58, 39), (57, 50), (55, 64)], "k", "n4")
    cv.rect(50, 52, 7, 3, "y2"); cv.px(51, 53, "y3")
    cv.line([(56, 39), (61, 30)], "k")
    cv.px(61, 30, "or"); cv.px(62, 29, "r3")
    return cv


def rooster_squat():
    """48x48, anchor bottom-center. Yard-bird squat: gut out, cheeks puffed, sleeves (no wings)."""
    cv = Canvas(48, 48)
    # legs: gold, crouched
    cv.rect(16, 38, 3, 7, "y2")
    cv.rect(29, 38, 3, 7, "y2")
    cv.line([(13, 45), (21, 45)], "y1")
    cv.line([(27, 45), (35, 45)], "y1")
    # round body (green suit) with belt
    cv.oval(8, 18, 32, 26, "g2", "k")
    cv.oval(12, 20, 16, 12, "g3")
    cv.rect(9, 34, 30, 3, "br2")
    cv.rect(21, 33, 6, 5, "y2")  # empty buckle
    cv.rect(23, 35, 2, 1, "k")
    # sleeves tucked (white gloves)
    cv.oval(5, 26, 8, 10, "g2", "k")
    cv.oval(35, 26, 8, 10, "g2", "k")
    cv.oval(5, 33, 6, 5, "w1", "k")
    cv.oval(37, 33, 6, 5, "w1", "k")
    # head, cheeks puffed
    cv.oval(13, 4, 22, 20, "g2", "k")
    cv.oval(11, 12, 8, 8, "g3", "k")
    cv.oval(29, 12, 8, 8, "g3", "k")
    for (x, y, w, h) in [(16, 0, 6, 7), (21, -1, 6, 8), (26, 1, 6, 6)]:
        cv.oval(x, y, w, h, "r2", "k")
    cv.oval(12, 4, 8, 8, "w1", "k"); cv.rect(13, 7, 2, 2, "k")
    cv.oval(28, 3, 8, 8, "w1", "k"); cv.rect(33, 5, 2, 2, "k")
    cv.poly([(19, 12), (29, 12), (32, 15), (20, 16)], "y2", "k")
    cv.px(22, 13, "k"); cv.px(26, 13, "k")
    cv.oval(20, 16, 4, 5, "r2", "k")
    return cv


def rooster_crow():
    """64x64, anchor bottom-center. The real PAH-KAW: chest out, beak open, arms up, feathers tucked."""
    cv = Canvas(64, 64)
    # legs
    cv.rect(24, 48, 4, 14, "y2"); cv.rect(36, 48, 4, 14, "y2")
    cv.line([(20, 62), (30, 62)], "y1"); cv.line([(34, 62), (44, 62)], "y1")
    # body
    cv.poly([(20, 50), (18, 30), (24, 22), (40, 22), (46, 30), (44, 50)], "g2", "k")
    cv.poly([(24, 24), (32, 40), (40, 24)], "g3")
    cv.rect(19, 44, 26, 3, "br2")
    cv.rect(29, 43, 6, 5, "y3")  # buckle holding the egg glow
    cv.oval(30, 44, 4, 3, "g4")
    # raised arms with gloves (sleeves, not wings)
    cv.poly([(20, 26), (8, 14), (6, 6), (11, 6), (14, 13), (24, 24)], "g2", "k")
    cv.poly([(44, 26), (56, 14), (58, 6), (53, 6), (50, 13), (40, 24)], "g2", "k")
    cv.oval(4, 1, 8, 7, "w1", "k"); cv.oval(52, 1, 8, 7, "w1", "k")
    # head tipped back
    cv.oval(22, 6, 20, 18, "g2", "k")
    for (x, y, w, h) in [(24, 0, 6, 8), (29, -1, 6, 8), (34, 1, 6, 7)]:
        cv.oval(x, y, w, h, "r2", "k")
    cv.oval(19, 6, 9, 9, "w1", "k"); cv.rect(21, 7, 2, 2, "k")
    cv.oval(36, 5, 9, 9, "w1", "k"); cv.rect(41, 9, 2, 2, "k")
    cv.poly([(28, 13), (40, 11), (47, 9), (40, 15)], "y2", "k")
    cv.poly([(29, 17), (40, 17), (46, 22), (38, 20)], "y1", "k")
    cv.poly([(30, 15), (40, 15), (42, 18), (32, 17)], "r1")
    cv.oval(28, 18, 4, 6, "r2", "k")
    return cv
