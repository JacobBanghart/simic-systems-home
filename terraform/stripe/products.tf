# Generated from live Stripe on 2026-10-05, then hand-maintained.
# Prices are resolved by the storefront via lookup_key (= catalogKey), not
# product.default_price, which this provider cannot set. Changing unit_amount
# replaces the price: the new one is created first and takes over the lookup
# key (transfer_lookup_key), then the old one is archived.

resource "stripe_product" "avatar_the_last_airbender_jumpstart_booster_display" {
  name        = "Avatar: The Last Airbender - Jumpstart Booster Display - Avatar: The Last Airbender (TLA)"
  description = "Avatar: The Last Airbender Jumpstart Booster Display contains 24 ready-to-play boosters, each packed with 20 Magic: The Gathering cards built around one of 46 distinct themes inspired by the animated series. Pick two packs, shuffle them together, and you're in for a duel. No deck building required.\n\nThemes draw from across all four nations: Fire Nation aggression, Water Tribe control, Earth Kingdom resilience, and Air Nomad finesse. Legendary creatures based on Aang, Katara, Sokka, Toph, and Zuko sit alongside iconic locations and artifacts from the show, all rendered in Magic card form. Every Jumpstart booster includes an exclusive full-art Appa land card that won't appear in any other Avatar product.\n\nThere's no format to learn and no deck to build going in, which makes this a solid pick for a casual game night with Avatar fans, a gift for a Magic player who grew up on the show, or just a quick way to open a full-art Appa.\n\nFactory sealed and sourced from authorized Wizards of the Coast distributors. Ships within the United States via USPS."
  active      = true
  images      = ["https://files.stripe.com/links/MDB8YWNjdF8xU2JEWWRSM1djdWNhUXFwfGZsX2xpdmVfNmlDRTBENTUwaWNjS0pWQmQ4OXJtWVJs00XirmpVGF"]
  tax_code    = "txcd_99999999"

  metadata = {
    catalogKey     = "avatar-the-last-airbender-jumpstart-booster-display-avatar-the-last-airbender-tla"
    catalogManaged = "true"
    category       = "magic"
    gtin           = "195166290713"
    quantity       = "2"
    slug           = "avatar-the-last-airbender-jumpstart-booster-display"
    sortOrder      = "999"
  }

  lifecycle {
    # Stock is owned at runtime by checkout reservations and the webhook.
    ignore_changes  = [metadata["quantity"]]
    prevent_destroy = true
  }
}

resource "stripe_price" "avatar_the_last_airbender_jumpstart_booster_display" {
  product             = stripe_product.avatar_the_last_airbender_jumpstart_booster_display.id
  currency            = "usd"
  unit_amount         = 11375
  tax_behavior        = "exclusive"
  lookup_key          = "avatar-the-last-airbender-jumpstart-booster-display-avatar-the-last-airbender-tla"
  transfer_lookup_key = true

  lifecycle {
    create_before_destroy = true
  }
}

resource "stripe_product" "avatar_the_last_airbender_play_booster_display" {
  name        = "Avatar: The Last Airbender - Play Booster Display - Avatar: The Last Airbender (TLA)"
  description = "Avatar: The Last Airbender comes to Magic: The Gathering as one of the more anticipated Universes Beyond crossovers to date. This Play Booster Display contains 30 packs, each with 14 cards and a guaranteed rare or better alongside at least one traditional foil. With 420 cards across the box, you'll have everything you need to draft, build Standard-legal decks, or chase the set's most coveted collectibles.\n\nThe set features legendary versions of the series' core cast, including Avatar Aang, Katara, Sokka, Toph, Zuko, and Azula, plus iconic villains, allies, and locations from the show. Elemental bending translates into keyword mechanics, with cards that reward air, water, earth, and fire-themed strategies mirroring each nation's combat style. Spirit creatures, bending showcase cards, and full-art lands themed around the four nations add real collector pull.\n\nChase targets include Borderless Anime showcase cards featuring the main cast in art that looks pulled straight from the original Nickelodeon series, plus foil treatments across the rarity spectrum. The set is legal in Standard and Commander formats.\n\nGood for draft nights, sealed events, or collecting the full Avatar roster in Magic card form. Factory sealed, sourced from authorized Wizards of the Coast distributors, and shipped within the United States via USPS."
  active      = true
  images      = ["https://files.stripe.com/links/MDB8YWNjdF8xU2JEWWRSM1djdWNhUXFwfGZsX2xpdmVfSXROendnMEkxc0V3N0l3aTR6c2RoZWdu00iHy5Yb1g"]
  tax_code    = "txcd_99999999"

  metadata = {
    catalogKey     = "avatar-the-last-airbender-play-booster-display-avatar-the-last-airbender-tla"
    catalogManaged = "true"
    category       = "magic"
    gtin           = "195166290416"
    quantity       = "4"
    slug           = "avatar-the-last-airbender-play-booster-display"
    sortOrder      = "999"
  }

  lifecycle {
    # Stock is owned at runtime by checkout reservations and the webhook.
    ignore_changes  = [metadata["quantity"]]
    prevent_destroy = true
  }
}

resource "stripe_price" "avatar_the_last_airbender_play_booster_display" {
  product             = stripe_product.avatar_the_last_airbender_play_booster_display.id
  currency            = "usd"
  unit_amount         = 13982
  tax_behavior        = "exclusive"
  lookup_key          = "avatar-the-last-airbender-play-booster-display-avatar-the-last-airbender-tla"
  transfer_lookup_key = true

  lifecycle {
    create_before_destroy = true
  }
}

resource "stripe_product" "final_fantasy_play_booster_display" {
  name        = "FINAL FANTASY - Play Booster Display - FINAL FANTASY (FIN)"
  description = "The FINAL FANTASY Play Booster Display brings the complete mainline saga, from FF1 through FF16, to Magic: The Gathering in a single, sprawling Universes Beyond set.\n\nThis display contains 30 Play Boosters, each with 14 cards and at least one traditional foil. Cards span over three decades of FINAL FANTASY history: collectors and fans will find iconic summons like Bahamut, Shiva, and Ifrit alongside legendary characters including Cloud, Lightning, Terra, Tidus, and Vivi. The set's mechanical identity leans into RPG progression and party-building themes, with plenty of room to build Commander and Standard decks.\n\nSignature showcase treatments include iconic in-game artwork frames, job-class card borders, and special foil-stamped art cards. Art cards appear in 30% of packs and foil-stamped signature art cards in 5%. Traditional foil treatments show up across all rarities.\n\nThe card pool rewards two different kinds of buyers at once. Magic players get a genuine Standard- and Commander-legal set built around RPG progression themes, while FINAL FANTASY fans get three decades of the series' cast rendered as cards worth collecting on their own. Crack a box to build a Crystal Chronicles Commander deck, or crack it hunting the Black Mage and Warrior of Light art specifically.\n\nFactory sealed, sourced from authorized Wizards of the Coast distributors. Ships within the United States via USPS."
  active      = false
  images      = ["https://files.stripe.com/links/MDB8YWNjdF8xU2JEWWRSM1djdWNhUXFwfGZsX2xpdmVfQXJHdEZ5c2JvODJYaU1oWU1ySFRCUkpY00Yk8eOzGR"]
  tax_code    = "txcd_99999999"

  metadata = {
    catalogKey     = "final-fantasy-play-booster-display-final-fantasy-fin"
    catalogManaged = "true"
    category       = "magic"
    gtin           = "195166270920"
    quantity       = "0"
    slug           = "final-fantasy-play-booster-display"
    sortOrder      = "999"
  }

  lifecycle {
    # Stock is owned at runtime by checkout reservations and the webhook.
    ignore_changes  = [metadata["quantity"]]
    prevent_destroy = true
  }
}

resource "stripe_price" "final_fantasy_play_booster_display" {
  product             = stripe_product.final_fantasy_play_booster_display.id
  currency            = "usd"
  unit_amount         = 14645
  tax_behavior        = "exclusive"
  lookup_key          = "final-fantasy-play-booster-display-final-fantasy-fin"
  transfer_lookup_key = true

  lifecycle {
    create_before_destroy = true
  }
}

resource "stripe_product" "innistrad_crimson_vow_collector_booster_display" {
  name        = "Innistrad: Crimson Vow - Collector Booster Display - Innistrad: Crimson Vow (VOW)"
  description = "Innistrad: Crimson Vow Collector Booster Display is the premium product for fans of Magic's gothic horror plane. This display contains 12 Collector Boosters plus 2 sealed box topper cards, rare extended-art versions of some of Crimson Vow's most powerful spells delivered outside the packs as an exclusive bonus.\n\nEach Collector Booster holds 15 Magic cards and 1 traditional foil token, with 5 guaranteed rares or mythic rares per pack. Premium contents include extended-art cards, borderless alternate-art versions of the set's most powerful spells, and etched foil treatments on fan-favorite legends. Phyrexian language showcase cards, Fang-frame treatments, and Stained Glass lands round out the collector content that makes Crimson Vow worth opening long after release.\n\nThe story follows Sorin Markov orchestrating a forced wedding between rival vampire bloodlines on a moonlit Innistrad, and the Collector Booster treatment brings the set's most dramatic moments to life with art and frame treatments you won't find in standard packs. Key Commander staples and eternal format playables appear throughout the set, which keeps this display valuable well beyond the initial crack.\n\nThis is a strong box for Commander players building tribal vampire decks or collectors chasing the full Crimson Vow showcase cycle. Factory sealed, sourced from authorized Wizards of the Coast distributors. Ships within the United States via USPS."
  active      = false
  images      = ["https://files.stripe.com/links/MDB8YWNjdF8xU2JEWWRSM1djdWNhUXFwfGZsX2xpdmVfS0hLaDlBU2VQM2RHOU0zSzhrUVQ1U1M4009hGARphF"]
  tax_code    = "txcd_99999999"

  metadata = {
    catalogKey     = "innistrad-crimson-vow-collector-booster-display-innistrad-crimson-vow-vow"
    catalogManaged = "true"
    category       = "magic"
    gtin           = "630509994618"
    quantity       = "0"
    slug           = "innistrad-crimson-vow-collector-booster-display"
    sortOrder      = "999"
  }

  lifecycle {
    # Stock is owned at runtime by checkout reservations and the webhook.
    ignore_changes  = [metadata["quantity"]]
    prevent_destroy = true
  }
}

resource "stripe_price" "innistrad_crimson_vow_collector_booster_display" {
  product             = stripe_product.innistrad_crimson_vow_collector_booster_display.id
  currency            = "usd"
  unit_amount         = 24217
  tax_behavior        = "exclusive"
  lookup_key          = "innistrad-crimson-vow-collector-booster-display-innistrad-crimson-vow-vow"
  transfer_lookup_key = true

  lifecycle {
    create_before_destroy = true
  }
}

resource "stripe_product" "kamigawa_neon_dynasty_collector_booster_display" {
  name        = "Kamigawa: Neon Dynasty - Collector Booster Display - Kamigawa: Neon Dynasty (NEO)"
  description = "Kamigawa: Neon Dynasty reimagined Magic's feudal Japan-inspired plane through a cyberpunk lens: neon cities, technological ninja, and ancient spirits coexist in a set with one of the most distinctive looks in Magic. This Collector Booster Display contains 12 Kamigawa: Neon Dynasty Collector Boosters, the direct route to the set's best cards.\n\nEach Collector Booster holds 15 Magic cards and 1 traditional foil double-sided token, with 5 rares or mythic rares guaranteed per pack. Expect extended-art treatments, Neon Ink showcase cards featuring the set's legendary creatures in a bold retro-futuristic art style, and borderless alternate-art planeswalkers. Foil-etched showcase cards and Saga frame treatments round out a genuinely striking visual identity.\n\nSeveral Commander format powerhouses and eternal-legal staples from this set have held their value well since release. The Channel and Reconfigure mechanics it introduced still see play in competitive formats today, and the legendary creature count is among the highest of any Magic set, which keeps feeding new Commander decks years later.\n\nWith strong foil density, desirable reprints, and an aesthetic unlike any other Magic set, this Collector Booster Display is a good pickup for collectors, Commander players, and fans of Japanese pop culture alike. Factory sealed, sourced from authorized Wizards of the Coast distributors. Ships within the United States via USPS."
  active      = false
  images      = ["https://files.stripe.com/links/MDB8YWNjdF8xU2JEWWRSM1djdWNhUXFwfGZsX2xpdmVfVkdRZGhGNEU5NXRVR2ZocnZvZGNXVnZT007u2d3DEO"]
  tax_code    = "txcd_99999999"

  metadata = {
    catalogKey     = "kamigawa-neon-dynasty-collector-booster-display-kamigawa-neon-dynasty-neo"
    catalogManaged = "true"
    category       = "magic"
    gtin           = "195166105338"
    quantity       = "0"
    slug           = "kamigawa-neon-dynasty-collector-booster-display"
    sortOrder      = "999"
  }

  lifecycle {
    # Stock is owned at runtime by checkout reservations and the webhook.
    ignore_changes  = [metadata["quantity"]]
    prevent_destroy = true
  }
}

resource "stripe_price" "kamigawa_neon_dynasty_collector_booster_display" {
  product             = stripe_product.kamigawa_neon_dynasty_collector_booster_display.id
  currency            = "usd"
  unit_amount         = 43319
  tax_behavior        = "exclusive"
  lookup_key          = "kamigawa-neon-dynasty-collector-booster-display-kamigawa-neon-dynasty-neo"
  transfer_lookup_key = true

  lifecycle {
    create_before_destroy = true
  }
}

resource "stripe_product" "lorwyn_eclipsed_collector_booster_display" {
  name        = "Lorwyn Eclipsed - Collector Booster Display - Lorwyn Eclipsed (ECL)"
  description = "Lorwyn Eclipsed Collector Booster Display is the premium configuration for one of 2025's more collector-focused Magic releases. This display contains 12 Collector Boosters, each loaded with 15 Magic cards, 11 to 12 of which are traditional foils, with 5 guaranteed rares or mythic rares per pack. Every booster includes a full-art basic land in either its Lorwyn daytime form or its Shadowmoor twilight variant.\n\nThe set merges two beloved worlds, the sun-drenched Lorwyn and its dark mirror Shadowmoor, into a single plane that shifts between eternal day and endless night. The premium treatments here include borderless reversible Shock Lands, Fable-frame cards depicting the plane's most legendary moments, and borderless cards illustrated by artists who defined the original Lorwyn and Shadowmoor sets in 2007.\n\nThe pull is concentrated in three places: Rebecca Guay's 1-of-500 serialized art cards, the foil Shock Land cycle (already a Commander and eternal-format staple in its own right), and the Fable-frame treatments unique to this set. A Collector Booster Display is worth it if any one of those three is the actual target. The odds of hitting all three in a single box are part of what drives this product's long-term collector value.\n\nFactory sealed, sourced from authorized Wizards of the Coast distributors. Ships within the United States via USPS."
  active      = true
  images      = ["https://files.stripe.com/links/MDB8YWNjdF8xU2JEWWRSM1djdWNhUXFwfGZsX2xpdmVfR0ZYYTNzeUg1VVl0bWtJMjM5cDNacHRo00hPTlnmgQ"]
  tax_code    = "txcd_99999999"

  metadata = {
    catalogKey     = "lorwyn-eclipsed-collector-booster-display-lorwyn-eclipsed-ecl"
    catalogManaged = "true"
    category       = "magic"
    gtin           = "0195166305356"
    quantity       = "2"
    slug           = "lorwyn-eclipsed-collector-booster-display"
    sortOrder      = "999"
  }

  lifecycle {
    # Stock is owned at runtime by checkout reservations and the webhook.
    ignore_changes  = [metadata["quantity"]]
    prevent_destroy = true
  }
}

resource "stripe_price" "lorwyn_eclipsed_collector_booster_display" {
  product             = stripe_product.lorwyn_eclipsed_collector_booster_display.id
  currency            = "usd"
  unit_amount         = 40450
  tax_behavior        = "exclusive"
  lookup_key          = "lorwyn-eclipsed-collector-booster-display-lorwyn-eclipsed-ecl"
  transfer_lookup_key = true

  lifecycle {
    create_before_destroy = true
  }
}

resource "stripe_product" "lorwyn_eclipsed_play_booster_display" {
  name        = "Lorwyn Eclipsed - Play Booster Display - Lorwyn Eclipsed (ECL)"
  description = "Lorwyn Eclipsed Play Booster Display contains 30 Play Boosters, each with 14 Magic: The Gathering cards, a guaranteed rare or better, and at least one traditional foil. The display offers 420 total cards spread across the merged Lorwyn and Shadowmoor planes, a crossroads of eternal day and endless twilight where creature tribes battle for the soul of the plane.\n\nKithkin, boggarts, merrow, Elves, Faeries, Giants, and Treefolk return from the original 2007 Lorwyn block, now joined by Shadowmoor's corrupted counterparts and the eerie creatures that thrive in the darkness between. New and returning mechanics capture the plane's dual nature: tribal synergies dominate the early turns while Shadowmoor's harsh countermeasures punish overextension.\n\nCollectors will want to chase Borderless showcase treatments, alternate-art legendary creatures drawn by artists who worked on the original sets, and the foil Shock Land cycle that appears across both Play and Collector product. The set is legal in Standard and Commander formats, and the tribal-focused card pool feeds existing Commander decks centered around Faeries, Elves, Merfolk, and Treefolk.\n\nAt an accessible price point for a 30-pack display, Lorwyn Eclipsed works well for draft nights, casual sealed events, or building out format-legal creature tribal decks. Factory sealed, sourced from authorized Wizards of the Coast distributors. Ships within the United States via USPS."
  active      = true
  images      = ["https://files.stripe.com/links/MDB8YWNjdF8xU2JEWWRSM1djdWNhUXFwfGZsX2xpdmVfQXZqRjBWSDZWcm9DRlNQQkxOcW42NmlB00e0jrNMP0"]
  tax_code    = "txcd_99999999"

  metadata = {
    catalogKey     = "lorwyn-eclipsed-play-booster-display-lorwyn-eclipsed-ecl"
    catalogManaged = "true"
    category       = "magic"
    gtin           = "195166305325"
    quantity       = "10"
    slug           = "lorwyn-eclipsed-play-booster-display"
    sortOrder      = "999"
  }

  lifecycle {
    # Stock is owned at runtime by checkout reservations and the webhook.
    ignore_changes  = [metadata["quantity"]]
    prevent_destroy = true
  }
}

resource "stripe_price" "lorwyn_eclipsed_play_booster_display" {
  product             = stripe_product.lorwyn_eclipsed_play_booster_display.id
  currency            = "usd"
  unit_amount         = 13667
  tax_behavior        = "exclusive"
  lookup_key          = "lorwyn-eclipsed-play-booster-display-lorwyn-eclipsed-ecl"
  transfer_lookup_key = true

  lifecycle {
    create_before_destroy = true
  }
}

resource "stripe_product" "magic_the_gathering_foundations_play_booster_display" {
  name        = "Magic: The Gathering Foundations - Play Booster Display - Foundations (FDN)"
  description = "Magic: The Gathering Foundations Play Booster Display is the essential set for new and returning players, and a reprint treasure for veterans. Designed as a milestone release, Foundations curates iconic, accessible, and useful cards from across Magic's 30+ year history into a single set that's legal in Standard and every major format.\n\nEach Play Booster contains 14 Magic cards with a guaranteed rare or better, a traditional foil, and a mix of commons, uncommons, and lands. The set's card list targets gameplay fundamentals: clean, powerful effects with minimal complexity that teach core Magic concepts while remaining competitive enough for experienced players. For Commander players, the set offers widely-played staples in fresh art, often at more accessible prices than previous printings.\n\nFor new players cracking their first booster box, Foundations provides a well-rounded starting collection. For returning players, it's a direct reprint of cards they remember from earlier formats in a fresh Standard-legal shell. Every rare slot carries genuine utility across multiple formats, so pack-opening stays satisfying regardless of what you pull.\n\nThis display makes a good gift for someone getting into Magic, a store's tournament prize support box, or a household collection starter. Factory sealed, sourced from authorized Wizards of the Coast distributors. Ships within the United States via USPS."
  active      = false
  images      = ["https://files.stripe.com/links/MDB8YWNjdF8xU2JEWWRSM1djdWNhUXFwfGZsX2xpdmVfd21KclM4bVNTTTQ1SGM0N0pXUVFJcEY200scWdq5LG"]
  tax_code    = "txcd_99999999"

  metadata = {
    catalogKey     = "magic-the-gathering-foundations-play-booster-display-foundations-fdn"
    catalogManaged = "true"
    category       = "magic"
    gtin           = "195166261782"
    quantity       = "0"
    slug           = "magic-the-gathering-foundations-play-booster-display"
    sortOrder      = "999"
  }

  lifecycle {
    # Stock is owned at runtime by checkout reservations and the webhook.
    ignore_changes  = [metadata["quantity"]]
    prevent_destroy = true
  }
}

resource "stripe_price" "magic_the_gathering_foundations_play_booster_display" {
  product             = stripe_product.magic_the_gathering_foundations_play_booster_display.id
  currency            = "usd"
  unit_amount         = 14022
  tax_behavior        = "exclusive"
  lookup_key          = "magic-the-gathering-foundations-play-booster-display-foundations-fdn"
  transfer_lookup_key = true

  lifecycle {
    create_before_destroy = true
  }
}

resource "stripe_product" "marvels_spider_man_collector_booster_display" {
  name        = "Marvel's Spider-Man - Collector Booster Display"
  description = "Marvel's Spider-Man Collector Booster Display brings 12 premium packs of the wall-crawler's Magic: The Gathering debut. Each Collector Booster delivers 15 cards with maximum foil density, including 5 guaranteed rares or mythic rares per pack, concentrating the set's Borderless and alternate-art treatments into fewer packs.\n\nThe Spider-Man set swings across the Spider-Verse, bringing Peter Parker, Miles Morales, Ghost-Spider, Silk, Spider-Man 2099, and the full rogues' gallery into cardboard form. The Borderless comic-art showcase cards are the draw here: illustrations designed to look like panels pulled directly from Marvel comics, with the bold linework and color palette fans know from four decades of Spider-Man stories.\n\nChase targets include Borderless showcase cards for each major Spider-hero and villain, traditional foil mythic rares, and serialized premium versions of top-tier legendary creatures. The set introduces web counter mechanics that reward building around Spider-team synergies, which gives Commander players a strong tribal shell right out of the gate.\n\nThis display is the right product for Marvel collectors, Spider-Man fans, and Commander players who want every premium treatment in one box.\n\nFactory sealed, sourced from authorized Wizards of the Coast distributors. Ships within the United States via USPS."
  active      = true
  images      = ["https://files.stripe.com/links/MDB8YWNjdF8xU2JEWWRSM1djdWNhUXFwfGZsX2xpdmVfc3NFOTNleWdJaEJVQ2hpbzhONlBsbHJt00kAQYN782"]
  tax_code    = "txcd_99999999"

  metadata = {
    catalogKey     = "marvel-s-spider-man-collector-booster-display"
    catalogManaged = "true"
    category       = "magic"
    gtin           = "195166289915"
    quantity       = "1"
    slug           = "marvels-spider-man-collector-booster-display"
    sortOrder      = "999"
  }

  lifecycle {
    # Stock is owned at runtime by checkout reservations and the webhook.
    ignore_changes  = [metadata["quantity"]]
    prevent_destroy = true
  }
}

resource "stripe_price" "marvels_spider_man_collector_booster_display" {
  product             = stripe_product.marvels_spider_man_collector_booster_display.id
  currency            = "usd"
  unit_amount         = 57325
  tax_behavior        = "exclusive"
  lookup_key          = "marvel-s-spider-man-collector-booster-display"
  transfer_lookup_key = true

  lifecycle {
    create_before_destroy = true
  }
}

resource "stripe_product" "marvels_spider_man_play_booster_display" {
  name        = "Marvel's Spider-Man - Play Booster Display - Marvel's Spider-Man (SPM)"
  description = "Marvel's Spider-Man Play Booster Display brings the full Spider-Verse to your draft table. This display contains 30 Play Boosters, each with 14 Magic cards, a guaranteed rare or better, and at least one traditional foil, for 420 total cards across a genuinely big Universes Beyond crossover.\n\nThe card pool spans four decades of Spider-Man history: Peter Parker in his classic red-and-blue suit, Miles Morales bringing Brooklyn energy to the battlefield, Ghost-Spider and Silk representing the wider Spider-Verse cast, and iconic villains including Green Goblin, Doctor Octopus, Venom, and the Sinister Six as legendary creatures and powerful spells. Web counter mechanics reward building sticky, synergistic boards, while the team-up theme mirrors the cooperative spirit of the comics.\n\nPlay Boosters are the primary format product for draft and sealed events, with pack contents that scale from useful commons to mythic chase cards. Borderless comic-art showcase treatments appear at all rarities, and traditional foils show up in each pack. The set is legal in Standard and Commander formats, with the legendary roster feeding directly into Spider-themed Commander decks.\n\nThe team-up theme and web counter mechanics give this set real depth at the table. Draft it for a Spider-Man-themed event, crack it to build a Marvel Commander deck around Miles Morales or Venom, or open it purely for the borderless comic-art pulls. Factory sealed, sourced from authorized Wizards of the Coast distributors. Ships within the United States via USPS."
  active      = true
  images      = ["https://files.stripe.com/links/MDB8YWNjdF8xU2JEWWRSM1djdWNhUXFwfGZsX2xpdmVfTnVueGJwYkVyTU1rTVk5NE1GTkREMEla00S7vvUf2w"]
  tax_code    = "txcd_99999999"

  metadata = {
    catalogKey     = "marvel-s-spider-man-play-booster-display-marvel-s-spider-man-spm"
    catalogManaged = "true"
    category       = "magic"
    gtin           = "195166289779"
    quantity       = "1"
    slug           = "marvels-spider-man-play-booster-display"
    sortOrder      = "999"
  }

  lifecycle {
    # Stock is owned at runtime by checkout reservations and the webhook.
    ignore_changes  = [metadata["quantity"]]
    prevent_destroy = true
  }
}

resource "stripe_price" "marvels_spider_man_play_booster_display" {
  product             = stripe_product.marvels_spider_man_play_booster_display.id
  currency            = "usd"
  unit_amount         = 12246
  tax_behavior        = "exclusive"
  lookup_key          = "marvel-s-spider-man-play-booster-display-marvel-s-spider-man-spm"
  transfer_lookup_key = true

  lifecycle {
    create_before_destroy = true
  }
}

resource "stripe_product" "marvel_super_heros_jumpstart_booster_display" {
  name        = "Marvel Super Heroes - Jumpstart Booster Display"
  description = "The game of chaotic combinations gets mashed up with the Marvel Universe! Just grab two packs, shuffle them together, and you're ready to battle. Each pack includes all the lands you need and has 1 of 51 possible Marvel Super Heroes themes; combine two to build your dream super team of Heroes and Villains and unleash their earthshaking abilities. With instant deck building and delightful theme combos, Jumpstart is great for a quick game or fun way to teach friends and family to play Magic."
  active      = true
  images      = ["https://files.stripe.com/links/MDB8YWNjdF8xU2JEWWRSM1djdWNhUXFwfGZsX2xpdmVfNjJYQTJlNWYzbWRvaDdWM0xkdThzWXM000j3X9BvHy"]
  tax_code    = "txcd_99999999"

  metadata = {
    catalogKey     = "marvel-super-heros-jumpstart-booster-display-marvel-super-heros-msh"
    catalogManaged = "false"
    category       = "magic"
    gtin           = "195166313269"
    quantity       = "6"
    slug           = "marvel-super-heros-jumpstart-booster-display"
    sortOrder      = "999"
  }

  lifecycle {
    # Stock is owned at runtime by checkout reservations and the webhook.
    ignore_changes  = [metadata["quantity"]]
    prevent_destroy = true
  }
}

resource "stripe_price" "marvel_super_heros_jumpstart_booster_display" {
  product             = stripe_product.marvel_super_heros_jumpstart_booster_display.id
  currency            = "usd"
  unit_amount         = 16245
  tax_behavior        = "exclusive"
  lookup_key          = "marvel-super-heros-jumpstart-booster-display-marvel-super-heros-msh"
  transfer_lookup_key = true

  lifecycle {
    create_before_destroy = true
  }
}

resource "stripe_product" "secrets_of_strixhaven_play_booster_display" {
  name        = "Secrets of Strixhaven - Play Booster Display - Secrets of Strixhaven (SOS)"
  description = "Secrets of Strixhaven Play Booster Display returns to Magic's best-known mage school for a deeper look at the mysteries buried beneath its halls. This display contains 30 Play Boosters, each with 14 Magic cards, a guaranteed rare or better, and at least one traditional foil: 420 cards of second-year curricula from Strixhaven's five elite magical colleges.\n\nSilverquill, Prismari, Witherbloom, Lorehold, and Quandrix are back with expanded card pools that build on established archetypes while unlocking more complex and dangerous spells. Each college brings its own two-color identity: Silverquill's black-white rhetoric and manipulation, Prismari's blue-red elemental artistry, Witherbloom's black-green life-and-death exchange, Lorehold's red-white historical magic, and Quandrix's blue-green mathematical scaling.\n\nThe story goes further than the original Strixhaven, with deeper mysteries surfacing across the campus, rival faction politics intensifying, and legendary professors taking center stage in ways the original set only hinted at. Showcase treatments draw from the original Strixhaven's academic aesthetics: mystical archive-style reprints, professor-frame legendary creatures, and campus-art basic lands.\n\nSecrets of Strixhaven is a strong draft environment for fans of multicolor synergy and the original Strixhaven experience. Commander players building college-themed or spellslinger decks will find solid additions across all five guilds.\n\nFactory sealed, sourced from authorized Wizards of the Coast distributors. Ships within the United States via USPS."
  active      = true
  images      = ["https://files.stripe.com/links/MDB8YWNjdF8xU2JEWWRSM1djdWNhUXFwfGZsX2xpdmVfSHFYT1RFbzA1ajNTTk92TUpKZVdlb0oy009bZ33Hev"]
  tax_code    = "txcd_99999999"

  metadata = {
    catalogKey     = "secrets-of-strixhaven-play-booster-display-secrets-of-strixhaven-sos"
    catalogManaged = "true"
    category       = "magic"
    gtin           = "195166316703"
    quantity       = "1"
    slug           = "secrets-of-strixhaven-play-booster-display"
    sortOrder      = "999"
  }

  lifecycle {
    # Stock is owned at runtime by checkout reservations and the webhook.
    ignore_changes  = [metadata["quantity"]]
    prevent_destroy = true
  }
}

resource "stripe_price" "secrets_of_strixhaven_play_booster_display" {
  product             = stripe_product.secrets_of_strixhaven_play_booster_display.id
  currency            = "usd"
  unit_amount         = 13151
  tax_behavior        = "exclusive"
  lookup_key          = "secrets-of-strixhaven-play-booster-display-secrets-of-strixhaven-sos"
  transfer_lookup_key = true

  lifecycle {
    create_before_destroy = true
  }
}

resource "stripe_product" "tarkir_dragonstorm_play_booster_display" {
  name        = "Tarkir: Dragonstorm - Play Booster Display - Tarkir: Dragonstorm (TDM)"
  description = "Tarkir: Dragonstorm Play Booster Display returns to Magic's dragon-focused plane for a clash between five clans and the Spirit Dragons they serve. This display contains 30 Play Boosters, each with 14 Magic: The Gathering cards, a guaranteed rare or better, at least one traditional foil, and a 20% chance of a bonus foil basic land.\n\nThe set's defining feature is its five-clan structure, each built around a distinct three-color combination. One clan favors aggressive dragon-riding combat, another plays for cunning and control, a third leans into resilience and endurance, and each has its own mechanical identity with a legendary Spirit Dragon as its anchor commander. Powerful dragonstorms spiral across the plane, and the set's threat-escalation mechanics reward both aggression and long-game strategies.\n\nChase targets include Borderless dragon showcase treatments, alternate-art Spirit Dragon legendaries in traditional foil, serialized Dragon Lord cards for premium collectors, and the full cycle of clan-specific mythic rares. The set is Standard and Commander legal, and the five Spirit Dragon legendaries have generated strong Commander demand since release.\n\nWith accessible pack pricing, a strong draft environment centered around three-color clan synergies, and a legendary-dense card pool for Commander players, Tarkir: Dragonstorm is a well-rounded box for any Magic player.\n\nFactory sealed, sourced from authorized Wizards of the Coast distributors. Ships within the United States via USPS."
  active      = false
  images      = ["https://files.stripe.com/links/MDB8YWNjdF8xU2JEWWRSM1djdWNhUXFwfGZsX2xpdmVfTGZXa0pYOEdGaHBTb0Q5Qmc4VU9tcG1n00oTubGzIk"]
  tax_code    = "txcd_99999999"

  metadata = {
    catalogKey     = "tarkir-dragonstorm-play-booster-display-tarkir-dragonstorm-tdm"
    catalogManaged = "true"
    category       = "magic"
    gtin           = "195166281148"
    quantity       = "0"
    slug           = "tarkir-dragonstorm-play-booster-display"
    sortOrder      = "999"
  }

  lifecycle {
    # Stock is owned at runtime by checkout reservations and the webhook.
    ignore_changes  = [metadata["quantity"]]
    prevent_destroy = true
  }
}

resource "stripe_price" "tarkir_dragonstorm_play_booster_display" {
  product             = stripe_product.tarkir_dragonstorm_play_booster_display.id
  currency            = "usd"
  unit_amount         = 13017
  tax_behavior        = "exclusive"
  lookup_key          = "tarkir-dragonstorm-play-booster-display-tarkir-dragonstorm-tdm"
  transfer_lookup_key = true

  lifecycle {
    create_before_destroy = true
  }
}

resource "stripe_product" "teenage_mutant_ninja_turtles_play_booster_display" {
  name        = "Teenage Mutant Ninja Turtles - Play Booster Display - Teenage Mutant Ninja Turtles (TMT)"
  description = "Teenage Mutant Ninja Turtles Play Booster Display puts the heroes in a half-shell onto the Magic battlefield in one of the more high-energy Universes Beyond crossovers yet. This display contains 30 Play Boosters, each with 14 Magic cards and a guaranteed rare or better, bringing Leonardo, Michelangelo, Donatello, and Raphael to your draft table.\n\nThe set's mechanical centerpiece is the Sneak mechanic, which rewards ambush-style play channeling the Turtles' guerrilla tactics in the sewers of New York City. Mutagen tokens power up your creatures over time, echoing the ooze-infused strength at the core of the TMNT universe. Both mechanics build toward explosive, board-flooding finishers that Commander players and Limited drafters will love.\n\nThe card pool spans four decades of TMNT lore: the original Mirage Comics era, the classic 1987 cartoon, the 2003 animated series, and modern comics. Iconic characters, including Shredder, Bebop, Rocksteady, Casey Jones, April O'Neil, and Splinter, appear as legendary creatures, removal spells, and supporting cards. Borderless comic-panel showcase treatments bring the bold art of the original Mirage comics to life.\n\nThis works well for casual TMNT fans cracking their first sealed product and for experienced players hunting ninja-clan Commander pieces. Factory sealed, sourced from authorized Wizards of the Coast distributors. Ships within the United States via USPS."
  active      = true
  images      = ["https://files.stripe.com/links/MDB8YWNjdF8xU2JEWWRSM1djdWNhUXFwfGZsX2xpdmVfbHRPVXJEWmpQS0I2ZXBUWDdjeERSbWlj0071MK18Zt"]
  tax_code    = "txcd_99999999"

  metadata = {
    catalogKey     = "teenage-mutant-ninja-turtles-play-booster-display-teenage-mutant-ninja-turtles-tmt"
    catalogManaged = "true"
    category       = "magic"
    gtin           = "0195166308036"
    quantity       = "6"
    slug           = "teenage-mutant-ninja-turtles-play-booster-display"
    sortOrder      = "999"
  }

  lifecycle {
    # Stock is owned at runtime by checkout reservations and the webhook.
    ignore_changes  = [metadata["quantity"]]
    prevent_destroy = true
  }
}

resource "stripe_price" "teenage_mutant_ninja_turtles_play_booster_display" {
  product             = stripe_product.teenage_mutant_ninja_turtles_play_booster_display.id
  currency            = "usd"
  unit_amount         = 14106
  tax_behavior        = "exclusive"
  lookup_key          = "teenage-mutant-ninja-turtles-play-booster-display-teenage-mutant-ninja-turtles-tmt"
  transfer_lookup_key = true

  lifecycle {
    create_before_destroy = true
  }
}

resource "stripe_product" "wilds_of_eldraine_collector_booster_display" {
  name        = "Wilds of Eldraine - Collector Booster Display - Wilds of Eldraine (WOE)"
  description = "Wilds of Eldraine Collector Booster Display is the premium way to explore Magic's fairytale plane. This display contains 12 Collector Boosters, densely packed with the set's rarest and most visually striking treatments, with every pack guaranteed to contain multiple premium foil cards and at least five rares or mythic rares.\n\nEldraine is a plane steeped in dark fairy tale lore: cursed sleeping kingdoms, enchanted forests, and warring courts of Faeries and Humans. Wilds of Eldraine ventures beyond the royal courts into the enchanted wilderness, where ancient magic runs wild and story-cursed Roles reshape creatures on the battlefield. The Storybook showcase treatments are the centerpiece of the Collector Boosters: cards illustrated in the style of illuminated manuscript pages, with art direction unlike anything else in Magic.\n\nChase targets include foil and non-foil Storybook showcase mythics, Enchanting Tale special guest reprints featuring eternal and Commander staples in fresh Eldraine-themed art, and alternate-art legendary Faeries for tribal Commander builds. The Enchanting Tale reprint sheet drives real collector value, with widely played Commander staples appearing in full thematic art for the first time.\n\nWilds of Eldraine Collector Boosters offer both the immediate excitement of opening premium product and long-term collection value through a strong reprint sheet. Factory sealed, sourced from authorized Wizards of the Coast distributors. Ships within the United States via USPS."
  active      = true
  images      = ["https://files.stripe.com/links/MDB8YWNjdF8xU2JEWWRSM1djdWNhUXFwfGZsX2xpdmVfRE8yU1NuQVBHc2d2bUk4bGdWa3pDdDI3009hrIoNje"]
  tax_code    = "txcd_99999999"

  metadata = {
    catalogKey     = "wilds-of-eldraine-collector-booster-display-wilds-of-eldraine-woe"
    catalogManaged = "true"
    category       = "magic"
    gtin           = "195166231945"
    quantity       = "0"
    slug           = "wilds-of-eldraine-collector-booster-display"
    sortOrder      = "999"
  }

  lifecycle {
    # Stock is owned at runtime by checkout reservations and the webhook.
    ignore_changes  = [metadata["quantity"]]
    prevent_destroy = true
  }
}

resource "stripe_price" "wilds_of_eldraine_collector_booster_display" {
  product             = stripe_product.wilds_of_eldraine_collector_booster_display.id
  currency            = "usd"
  unit_amount         = 114619
  tax_behavior        = "exclusive"
  lookup_key          = "wilds-of-eldraine-collector-booster-display-wilds-of-eldraine-woe"
  transfer_lookup_key = true

  lifecycle {
    create_before_destroy = true
  }
}
