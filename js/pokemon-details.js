"use strict";

const PokemonDetails = (() => {
    const DATA_PATH = "data/pokemon-details/";

    const params = new URLSearchParams(window.location.search);
    const pokemonId = params.get("id");
    const selectedForm = params.get("form");

    let pokemonData = null;

    const $ = (selector) => document.querySelector(selector);

    // =========================================================
    // FUNÇÕES AUXILIARES
    // =========================================================

    async function fetchJSON(path) {
        const response = await fetch(path);

        if (!response.ok) {
            throw new Error(`Não foi possível carregar: ${path}`);
        }

        return response.json();
    }

    
    function setText(selector, value, fallback = "") {
        const element = $(selector);
        if (!element) return;

        const hasValue =
            value !== undefined &&
            value !== null &&
            String(value).trim() !== "";

        const text = hasValue ? String(value) : fallback;

        element.textContent = text;
        element.hidden = text === "";
    }

    function setTextOrHide(selector, value, fallback = "") {
        const element = $(selector);
        if (!element) return;

        const hasValue =
            value !== null &&
            value !== undefined &&
            String(value).trim() !== "";

        setHidden(selector, !hasValue);
        element.textContent = hasValue ? String(value) : fallback;
    }


    function setImage(selector, src, alt = "") {
        const element = $(selector);

        if (!element) return;

        if (src) {
            element.src = src;
            element.alt = alt;
            element.hidden = false;

            element.onerror = () => {
                element.hidden = true;
            };
        } else {
            element.removeAttribute("src");
            element.alt = "";
            element.hidden = true;
        }
    }

    function setHidden(selector, hidden) {
        const element = $(selector);

        if (element) {
            element.hidden = hidden;
        }
    }

    function normalizeString(value) {
        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function getPokemonNumber(pokemon) {
        return (
            pokemon?.dexNumber ??
            pokemon?.id ??
            pokemon?.number ??
            ""
        );
    }

    function getImagePath(pokemon) {
        return (
            pokemon?.image ||
            pokemon?.imageUrl ||
            pokemon?.sprite ||
            pokemon?.artwork ||
            ""
        );
    }

    // =========================================================
    // TIPOS
    // =========================================================

    
    function normalizeTypes(types = []) {
        const typeNames = {
            normal: "Normal",
            fire: "Fogo",
            water: "Água",
            electric: "Elétrico",
            grass: "Planta",
            ice: "Gelo",
            fighting: "Lutador",
            poison: "Veneno",
            ground: "Terra",
            flying: "Voador",
            psychic: "Psíquico",
            bug: "Inseto",
            rock: "Pedra",
            ghost: "Fantasma",
            dragon: "Dragão",
            dark: "Sombrio",
            steel: "Aço",
            fairy: "Fada"
        };

        const aliases = {
            grama: "grass",
            planta: "grass",
            eletrico: "electric",
            lutador: "fighting",
            voador: "flying",
            fogo: "fire",
            agua: "water",
            gelo: "ice",
            psiquico: "psychic",
            inseto: "bug",
            pedra: "rock",
            terra: "ground",
            veneno: "poison",
            fantasma: "ghost",
            sombrio: "dark",
            aco: "steel",
            fada: "fairy",
            dragao: "dragon",
            normal: "normal"
        };

        if (!Array.isArray(types)) {
            types = types ? [types] : [];
        }

        return types.map(type => {
            const raw = typeof type === "object" && type !== null
                ? (type.id || type.name || "")
                : type;

            const normalized = String(raw)
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .trim()
                .replace(/\s+/g, "-");

            const id = aliases[normalized] || normalized;
            const name = typeNames[id] ||
                (typeof type === "object" && type !== null
                    ? type.name
                    : String(type));

            return { id, name };
        });
    }

    function renderTypes(types = []) {
        const container = $("#pokemon-types");
        if (!container) return;

        container.replaceChildren();

        normalizeTypes(types).forEach(type => {
            const badge = document.createElement("span");
            badge.className = `type type-${type.id}`;
            badge.textContent = type.name;
            container.appendChild(badge);
        });
    }

    function renderTypes(types = []) {
        const container = $("#pokemon-types");

        if (!container) return;

        container.replaceChildren();

        normalizeTypes(types).forEach((type) => {
            const badge = document.createElement("span");

            badge.className = `type type-${type.id}`;
            badge.textContent = type.name;

            container.appendChild(badge);
        });
    }

    // =========================================================
    // ATRIBUTOS
    // =========================================================

    function renderStats(stats = {}) {
        const statMap = {
            hp: ["#stat-hp-value", "#stat-hp"],
            attack: ["#stat-attack-value", "#stat-attack"],
            defense: ["#stat-defense-value", "#stat-defense"],
            spAttack: ["#stat-spatk-value", "#stat-spatk"],
            spDefense: ["#stat-spdef-value", "#stat-spdef"],
            speed: ["#stat-speed-value", "#stat-speed"]
        };

        Object.entries(statMap).forEach(([key, selectors]) => {
            const value = Number(stats[key] ?? 0);

            setText(selectors[0], value);

            const bar = $(selectors[1]);

            if (bar) {
                bar.style.width =
                    `${Math.min((value / 255) * 100, 100)}%`;
            }
        });

        const total =
            stats.total ??
            Object.values({
                hp: stats.hp,
                attack: stats.attack,
                defense: stats.defense,
                spAttack: stats.spAttack,
                spDefense: stats.spDefense,
                speed: stats.speed
            }).reduce(
                (sum, value) => sum + Number(value ?? 0),
                0
            );

        setText("#stat-total", total);
    }

    // =========================================================
    // CONFIGURAÇÃO DE BATALHA
    // =========================================================

    
    function renderBattle(battle = {}, formId = null) {
        const data = battle || {};

        const role = data.role;
        const nature = data.nature;
        const ability = data.ability;
        const item = data.item;

        setText(
            "#battle-role",
            role?.name || role || ""
        );
        setText(
            "#battle-role-description",
            role?.description || data.roleDescription || ""
        );

        setText(
            "#battle-nature",
            nature?.name || nature || ""
        );
        setText(
            "#battle-nature-description",
            nature?.description || data.natureDescription || ""
        );

        setText(
            "#battle-ability",
            ability?.name || ability || ""
        );
        setText(
            "#battle-ability-description",
            ability?.description || data.abilityDescription || ""
        );

        setText(
            "#battle-item",
            item?.name || item || ""
        );
        setText(
            "#battle-item-description",
            item?.description || data.itemDescription || ""
        );

        renderBattleEVs(data.evs || {});

        const moves = Array.isArray(data.moves) ? data.moves : [];

        for (let i = 0; i < 4; i++) {
            const element = $(`#move-${i + 1}`);
            if (!element) continue;

            const move = moves[i];

            const moveName =
                typeof move === "object" && move !== null
                    ? move.name
                    : move;

            element.textContent = moveName || "";
            element.hidden = !moveName;
        }

        const normalizedForm = normalizeString(formId);

        const isGmax = ["gigantamax", "gmax"].includes(normalizedForm);

        const isTera = ["tera", "terastal", "terastalizacao"].includes(normalizedForm);

        setHidden("#gmax-battle-card", true);
        setHidden("#tera-battle-card", true);

        
        
        if (isGmax) {
            const gmax =
                data.gigantamaxBattle ||
                data.gmax ||
                data.gigantamax ||
                {};

            setTextOrHide(
                "#gmax-move",
                gmax.move || gmax.name || data.gmaxMove
            );

            setTextOrHide(
                "#gmax-description",
                gmax.description || data.gmaxDescription
            );

            const hasGmaxData = Boolean(
                gmax.move ||
                gmax.name ||
                gmax.description ||
                data.gmaxMove ||
                data.gmaxDescription
            );

            setHidden("#gmax-battle-card", !hasGmaxData);
        }

        if (isTera) {
            const tera = data.teraBattle || data.tera || {};

            setTextOrHide(
                "#tera-type",
                tera.type || tera.name || data.teraType
            );

            setTextOrHide(
                "#tera-description",
                tera.description || data.teraDescription
            );

            const hasTeraData = Boolean(
                tera.type ||
                tera.name ||
                tera.description ||
                data.teraType ||
                data.teraDescription
            );

            setHidden("#tera-battle-card", !hasTeraData);
        }
    }

    
    function renderBattleEVs(evs = {}) {
        const container = $("#battle-evs");
        if (!container) return;

        const statLabels = [
            ["hp", "HP", ["hp"]],
            ["attack", "ATK", ["attack", "atk"]],
            ["defense", "DEF", ["defense", "def"]],
            ["spAttack", "SP. ATK", ["spAttack", "spAtk", "spattack", "spatk"]],
            ["spDefense", "SP. DEF", ["spDefense", "spDef", "spdefense", "spdef"]],
            ["speed", "SPEED", ["speed", "spe"]]
        ];

        container.replaceChildren();

        const entries = statLabels
            .map(([key, label, aliases]) => {
                const foundKey = aliases.find(alias =>
                    Object.prototype.hasOwnProperty.call(evs, alias)
                );

                return foundKey === undefined
                    ? null
                    : { key, label, value: evs[foundKey] };
            })
            .filter(entry =>
                entry !== null &&
                entry.value !== null &&
                entry.value !== undefined
            );

        if (entries.length === 0) {
            const empty = document.createElement("span");
            empty.textContent = "Sem EVs definidos";
            container.appendChild(empty);
            return;
        }

        entries.forEach(({ label, value }) => {
            const row = document.createElement("div");
            row.className = "ev-row";

            const name = document.createElement("span");
            name.textContent = label;

            const amount = document.createElement("strong");
            amount.textContent = String(value);

            row.append(name, amount);
            container.appendChild(row);
        });
    }

    // =========================================================
    // REGISTRO DA FORMA
    // =========================================================

    
    function renderFormDetails(details = {}) {
        const data = details || {};

        const fields = [
            {
                selector: "#form-type",
                value: data.type || data.classification ||
                    pokemonData?.formType || pokemonData?.classification
            },
            {
                selector: "#form-origin",
                value: data.origin || pokemonData?.origin
            },
            {
                selector: "#form-condition",
                value: data.condition || pokemonData?.condition
            },
            {
                selector: "#form-registration",
                value: data.registration || pokemonData?.registration
            }
        ];

        let visibleCards = 0;

        fields.forEach(({ selector, value }) => {
            const element = $(selector);
            if (!element) return;

            const card = element.closest(".form-detail-card");
            const hasValue =
                value !== undefined &&
                value !== null &&
                String(value).trim() !== "";

            element.textContent = hasValue ? String(value) : "";

            if (card) {
                card.hidden = !hasValue;
            } else {
                element.hidden = !hasValue;
            }

            if (hasValue) visibleCards++;
        });

        const section = $(".form-details");
        if (section) {
            section.hidden = visibleCards === 0;
        }
    }

    // =========================================================
    // LINHA EVOLUTIVA COMPLETA
    // =========================================================

    function renderEvolution(evolution) {
        const container = $(".evolution-chain");

        if (!container) return;

        container.replaceChildren();

        if (!evolution) {
            container.hidden = true;
            return;
        }

        let chain = [];

        /*
         * Formatos aceitos:
         *
         * evolution: [estágio1, estágio2, estágio3]
         *
         * evolution: {
         *   stages: [estágio1, estágio2, estágio3]
         * }
         *
         * evolution: {
         *   chain: [estágio1, estágio2, estágio3]
         * }
         *
         * Se o JSON só tiver previous/next, utiliza
         * esses campos como alternativa.
         */

        if (Array.isArray(evolution)) {
            chain = [...evolution];
        } else if (Array.isArray(evolution.stages)) {
            chain = [...evolution.stages];
        } else if (Array.isArray(evolution.chain)) {
            chain = [...evolution.chain];
        } else if (Array.isArray(evolution.group)) {
            chain = [...evolution.group];
        } else if (Array.isArray(evolution.pokemon)) {
            chain = [...evolution.pokemon];
        } else {
            if (evolution.previous) {
                if (Array.isArray(evolution.previous)) {
                    chain.push(...evolution.previous);
                } else {
                    chain.push(evolution.previous);
                }
            }

            chain.push({
                id: pokemonData.id,
                dexNumber: pokemonData.dexNumber,
                name: pokemonData.name,
                image: pokemonData.image,
                current: true
            });

            if (evolution.next) {
                if (Array.isArray(evolution.next)) {
                    chain.push(...evolution.next);
                } else {
                    chain.push(evolution.next);
                }
            }
        }

        // Garante que o Pokémon atual esteja na cadeia.
        const currentNumber = String(
            pokemonData.dexNumber ?? pokemonData.id ?? ""
        );

        const hasCurrent = chain.some((entry) => {
            const entryNumber = String(getPokemonNumber(entry));

            return entry.current || entryNumber === currentNumber;
        });

        if (!hasCurrent) {
            chain.push({
                id: pokemonData.id,
                dexNumber: pokemonData.dexNumber,
                name: pokemonData.name,
                image: pokemonData.image,
                current: true
            });
        }

        // Remove registros duplicados pelo número da Pokédex.
        const uniqueChain = [];
        const seen = new Set();

        chain.forEach((entry) => {
            if (!entry || typeof entry !== "object") return;

            const number = String(getPokemonNumber(entry));

            if (number && seen.has(number)) return;

            if (number) seen.add(number);

            uniqueChain.push(entry);
        });

        if (!uniqueChain.length) {
            container.hidden = true;
            return;
        }

        container.hidden = false;

        uniqueChain.forEach((entry, index) => {
            if (index > 0) {
                const arrow = document.createElement("div");

                arrow.className = "evolution-arrow";
                arrow.textContent = "→";

                container.appendChild(arrow);
            }

            const card = document.createElement("button");

            card.type = "button";
            card.className = "evolution-card";

            const entryNumber = getPokemonNumber(entry);

            const isCurrent =
                entry.current === true ||
                String(entryNumber) === currentNumber;

            if (isCurrent) {
                card.classList.add("active");
                card.classList.add("is-current");
                card.setAttribute("aria-current", "true");
                card.disabled = true;
            }

            // Número da Pokédex.
            const number = document.createElement("span");

            number.className = "evolution-number";
            number.textContent = entryNumber
                ? `#${entryNumber}`
                : "";

            // Imagem do Pokémon.
            const imageContainer = document.createElement("div");

            imageContainer.className = "evolution-image";

            const imagePath = getImagePath(entry);

            if (imagePath) {
                const image = document.createElement("img");

                image.src = imagePath;
                image.alt = entry.name || "Pokémon";
                image.loading = "lazy";

                image.onerror = () => {
                    image.hidden = true;
                };

                imageContainer.appendChild(image);
            }

            // Nome.
            const name = document.createElement("strong");

            name.textContent = entry.name || "Desconhecido";

            // Condição evolutiva.
            const condition = document.createElement("small");

            condition.textContent =
                entry.condition ||
                (isCurrent ? "FORMA ATUAL" : "EVOLUÇÃO");

            card.append(
                number,
                imageContainer,
                name,
                condition
            );

            // Navegação para os outros estágios.
            if (!isCurrent && entryNumber) {
                card.addEventListener("click", () => {
                    window.location.href =
                        `pokemon.html?id=${encodeURIComponent(entryNumber)}`;
                });
            }

            container.appendChild(card);
        });
    }

    // =========================================================
    // FORMAS ESPECIAIS
    // =========================================================

    function renderSpecialForms(forms = []) {
        const container = $(".special-form-grid");

        if (!container) return;

        container.replaceChildren();

        const section = container.closest("section");

        if (!Array.isArray(forms) || !forms.length) {
            if (section) section.hidden = true;
            return;
        }

        if (section) section.hidden = false;

        forms.forEach((form) => {
            const card = document.createElement("button");

            card.type = "button";
            card.className = "special-form-card";
            card.dataset.form = form.id || "";

            const imageContainer = document.createElement("div");

            imageContainer.className = "special-form-image";

            const image = document.createElement("img");

            image.src = getImagePath(form) || getImagePath(pokemonData);
            image.alt = form.name || "Forma especial";
            image.loading = "lazy";

            image.onerror = () => {
                image.hidden = true;
            };

            imageContainer.appendChild(image);

            const info = document.createElement("div");

            info.className = "special-form-info";

            const number = document.createElement("span");

            number.textContent =
                form.displayNumber ||
                (
                    form.id === "gigantamax"
                        ? `#${pokemonData.dexNumber}-G`
                        : form.id === "tera"
                            ? `#${pokemonData.dexNumber}-T`
                            : `#${pokemonData.dexNumber}`
                );

            const name = document.createElement("strong");

            name.textContent = form.name || "Forma especial";

            const description = document.createElement("small");

            const section = $(".special-forms");
            const grid = $(".special-form-grid");

            if (!Array.isArray(forms) || forms.length === 0) {
                if (section) section.hidden = true;
                if (grid) grid.replaceChildren();
                return;
            }

            if (section) section.hidden = false;

            description.textContent =
                form.type ||
                form.description ||
                "FORMA ESPECIAL";

            info.append(number, name, description);

            card.append(imageContainer, info);

            const isActive = selectedForm === form.id;

            card.classList.toggle("active", isActive);
            card.setAttribute("aria-pressed", String(isActive));

            card.addEventListener("click", () => {
                if (
                    form.id === "ancient-warden" ||
                    Number(form.targetDexNumber) === 157
                ) {
                    window.location.href = "pokemon.html?id=157";
                    return;
                }

                const url = new URL(window.location.href);

                url.searchParams.set("id", pokemonData.dexNumber);
                url.searchParams.set("form", form.id);

                window.location.href = url.toString();
            });

            container.appendChild(card);
        });
    }

    // =========================================================
    // POKÉMON RELACIONADOS
    // =========================================================

    
    
    function renderRelatedPokemon(related = []) {
        const container = $("#related-pokemon");
        if (!container) return;

        container.replaceChildren();

        const section = container.closest("section");

        if (!Array.isArray(related) || related.length === 0) {
            if (section) section.hidden = true;
            return;
        }

        if (section) section.hidden = false;

        related.forEach((entry) => {
            const number = getPokemonNumber(entry);

            // Usa o mesmo elemento e as mesmas classes das formas especiais.
            const card = document.createElement("a");
            card.className = "special-form-card related-form-card";

            card.href = number !== ""
                ? `pokemon.html?id=${encodeURIComponent(number)}`
                : "#";

            if (number === "") {
                card.addEventListener("click", (event) => {
                    event.preventDefault();
                });
            }

            // Imagem
            const imageContainer = document.createElement("div");
            imageContainer.className = "special-form-image";

            const imagePath = getImagePath(entry);

            if (imagePath) {
                const image = document.createElement("img");
                image.src = imagePath;
                image.alt = entry.name || "Pokémon relacionado";
                image.loading = "lazy";

                image.onerror = () => {
                    image.hidden = true;
                };

                imageContainer.appendChild(image);
            }

            // Informações
            const info = document.createElement("div");
            info.className = "special-form-info";

            const numberElement = document.createElement("span");
            numberElement.className = "related-form-number";
            numberElement.textContent = number !== "" ? `#${number}` : "";

            const name = document.createElement("strong");
            name.textContent = entry.name || "Pokémon";

            const description = document.createElement("small");
            description.textContent =
                entry.relationship ||
                entry.category ||
                "REGISTRO RELACIONADO";

            info.append(numberElement, name, description);
            card.append(imageContainer, info);

            container.appendChild(card);
        });
    }

    // =========================================================
    // RENDERIZAÇÃO DO POKÉMON BASE
    // =========================================================

    function renderBasePokemon() {
        setText("#dex-number", pokemonData.dexNumber);
        setText("#entry-number", `#${pokemonData.dexNumber}`);
        setText("#footer-dex-number", pokemonData.dexNumber);
        setText("#form-number", `#${pokemonData.dexNumber}`);

        setText("#pokemon-name", pokemonData.name);
        setText("#pokemon-category", pokemonData.category);
        setText("#form-label", pokemonData.classification || "Pokémon");

        setImage(
            "#pokemon-image",
            pokemonData.image,
            pokemonData.name
        );

        setText("#art-number", `#${pokemonData.dexNumber}`);
        setText("#art-caption", pokemonData.name);

        setText("#pokemon-height", pokemonData.height);
        setText("#pokemon-weight", pokemonData.weight);
        setText("#pokemon-habitat", pokemonData.habitat);
        setText("#pokemon-rarity", pokemonData.rarity);

        setText("#pokemon-ability", pokemonData.ability?.name);
        setText("#ability-description", pokemonData.ability?.description);

        setText("#pokemon-description", pokemonData.description);

        setText("#lore-title", pokemonData.lore?.title);
        setText("#pokemon-lore", pokemonData.lore?.text);
        setText("#lore-quote", pokemonData.lore?.quote);

        renderFormDetails({
            type: pokemonData.formType || pokemonData.classification,
            origin: pokemonData.origin,
            condition: pokemonData.condition,
            registration: pokemonData.registration
        });

        renderTypes(pokemonData.types);
        renderStats(pokemonData.stats);

        // Na forma base, G-Max e Tera ficam ocultos.
        renderBattle(pokemonData.battle, null);

        document.title = `${pokemonData.name} | Pokédex`;
    }

    // =========================================================
    // APLICAÇÃO DA FORMA SELECIONADA
    // =========================================================

    function applySelectedForm() {
        const form = (pokemonData.specialForms || []).find(
            (item) => item.id === selectedForm
        );

        if (!form) {
            renderBasePokemon();
            return;
        }

        setText("#dex-number", pokemonData.dexNumber);
        setText("#entry-number", `#${pokemonData.dexNumber}`);
        setText("#footer-dex-number", pokemonData.dexNumber);

        setText(
            "#form-number",
            form.displayNumber || `#${pokemonData.dexNumber}`
        );

        setText("#pokemon-name", form.name || pokemonData.name);
        setText("#pokemon-category", pokemonData.category);

        setText(
            "#form-label",
            form.type || form.classification || "Forma especial"
        );

        setImage(
            "#pokemon-image",
            getImagePath(form) || getImagePath(pokemonData),
            form.name || pokemonData.name
        );

        setText("#art-number", form.displayNumber || `#${pokemonData.dexNumber}`);
        setText("#art-caption", form.name || pokemonData.name);

        setText(
            "#pokemon-height",
            form.height ?? pokemonData.height,
            "Não registrado"
        );

        setText(
            "#pokemon-weight",
            form.weight ?? pokemonData.weight,
            "Não registrado"
        );

        setText("#pokemon-habitat", pokemonData.habitat);
        setText("#pokemon-rarity", pokemonData.rarity);

        const ability = form.ability || pokemonData.ability;

        setText("#pokemon-ability", ability?.name);
        setText("#ability-description", ability?.description);

        setText(
            "#pokemon-description",
            form.description || pokemonData.description
        );

        setText("#lore-title", pokemonData.lore?.title);
        setText("#pokemon-lore", pokemonData.lore?.text);
        setText("#lore-quote", pokemonData.lore?.quote);

        renderFormDetails({
            type: form.type || form.classification || "Forma especial",
            origin: form.origin || pokemonData.origin,
            condition: form.condition || pokemonData.condition,
            registration: form.registration || pokemonData.registration
        });

        renderTypes(form.types || pokemonData.types);
        renderStats(form.stats || pokemonData.stats);

        let battle = pokemonData.battle || {};

        if (
            form.id === "gigantamax" &&
            battle.gigantamaxBattle
        ) {
            battle = {
                ...battle,
                ...(battle.gigantamaxBattle.strategy || {})
            };
        }

        if (
            form.id === "tera" &&
            battle.teraBattle
        ) {
            battle = {
                ...battle,
                ...battle.teraBattle
            };
        }

        // Usa os dados preparados para a forma selecionada.
        renderBattle(battle, selectedForm);

        document.querySelectorAll(".special-form-card").forEach((card) => {
            const active = card.dataset.form === selectedForm;

            card.classList.toggle("active", active);
            card.setAttribute("aria-pressed", String(active));
        });

        document.title = `${form.name || pokemonData.name} | Pokédex`;
    }

    // =========================================================
    // CONTROLES DA PÁGINA
    // =========================================================

    function setupControls() {
        const scanButton = $("#scan-button");

        if (scanButton) {
            scanButton.addEventListener("click", () => {
                const pokedex = $("#pokedex");

                if (!pokedex) return;

                pokedex.classList.add("scanning");

                setText("#scan-status-text", "ANALISANDO REGISTRO...");

                window.setTimeout(() => {
                    pokedex.classList.remove("scanning");
                    setText("#scan-status-text", "SISTEMA ONLINE");
                }, 1000);
            });
        }

        const forms = pokemonData.specialForms || [];

        const currentIndex = forms.findIndex(
            (form) => form.id === selectedForm
        );

        function navigateForm(direction) {
            if (!forms.length) return;

            const nextIndex =
                currentIndex === -1
                    ? (direction > 0 ? 0 : forms.length - 1)
                    : (
                        currentIndex +
                        direction +
                        forms.length
                    ) % forms.length;

            const url = new URL(window.location.href);

            url.searchParams.set("id", pokemonData.dexNumber);
            url.searchParams.set("form", forms[nextIndex].id);

            window.location.href = url.toString();
        }

        const previous = $("#previous-form");
        const next = $("#next-form");

        if (previous) {
            previous.addEventListener("click", () => navigateForm(-1));
        }

        if (next) {
            next.addEventListener("click", () => navigateForm(1));
        }

        const pagination = $(".form-pagination");

        if (pagination) {
            pagination.replaceChildren();

            const entries = [
                {
                    id: null,
                    name: pokemonData.name
                },
                ...forms
            ];

            entries.forEach((entry, index) => {
                const dot = document.createElement("button");

                dot.type = "button";
                dot.className = "pagination-dot";

                dot.setAttribute(
                    "aria-label",
                    entry.name || `Forma ${index + 1}`
                );

                const active = entry.id
                    ? entry.id === selectedForm
                    : !selectedForm;

                dot.classList.toggle("active", active);

                dot.addEventListener("click", () => {
                    const url = new URL(window.location.href);

                    url.searchParams.set("id", pokemonData.dexNumber);

                    if (entry.id) {
                        url.searchParams.set("form", entry.id);
                    } else {
                        url.searchParams.delete("form");
                    }

                    window.location.href = url.toString();
                });

                pagination.appendChild(dot);
            });
        }
    }

    // =========================================================
    // TRATAMENTO DE ERROS
    // =========================================================

    function renderError(message) {
        const error = $("#detail-error");

        if (error) {
            error.hidden = false;
            setText("#detail-error-message", message);
        } else {
            console.error(message);
        }
    }

    // =========================================================
    // INICIALIZAÇÃO
    // =========================================================

    async function init() {
        if (!pokemonId) {
            renderError("Nenhum Pokémon foi selecionado.");
            return;
        }

        try {
            pokemonData = await fetchJSON(
            `${DATA_PATH}${encodeURIComponent(pokemonId)}.json`
        );

            renderBasePokemon();
            renderEvolution(pokemonData.evolution);
            renderSpecialForms(pokemonData.specialForms);
            renderRelatedPokemon(pokemonData.relatedPokemon);

            applySelectedForm();
            setupControls();

        } catch (error) {
            console.error(error);

            renderError(
                "Não foi possível carregar os dados deste Pokémon. " +
                "Verifique o endereço da página e o arquivo JSON correspondente."
            );
        }
    }

    document.addEventListener("DOMContentLoaded", init);

    return { init };
})();