
"use strict";

const pokemonGrid = document.getElementById("pokemon-grid");
const searchInput = document.getElementById("pokemon-search");
const typeFilter = document.getElementById("type-filter");
const categoryFilter = document.getElementById("category-filter");
const specialFilter = document.getElementById("special-filter");
const statusFilter = document.getElementById("status-filter");
const resetButton = document.getElementById("reset-filters");

const loadingState = document.getElementById("dex-loading");
const emptyState = document.getElementById("dex-empty");
const errorState = document.getElementById("dex-error");
const pokemonCount = document.getElementById("pokemon-count");

let pokemonDatabase = [];
let filteredPokemon = [];
let basePokemonDatabase = [];
let specialPokemonDatabase = [];

const TYPE_NAMES = {
    normal: "Normal",
    fire: "Fogo",
    water: "Água",
    electric: "Elétrico",
    grass: "Grama",
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

const FEATURE_NAMES = {
    mega: "Mega Evolução",
    gigantamax: "Gigantamax",
    tera: "Terastalização",
    paradox: "Paradoxo",
    regional: "Forma Regional"
};

function normalizeValue(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function getTypeId(type) {
    if (typeof type === "object" && type !== null) {
        // Aceita { id: "fire" }, { name: "Fogo" }
        // e também { type: { name: "fire" } }.
        const value =
            type.id ||
            type.name ||
            type.type?.id ||
            type.type?.name ||
            "";

        return normalizeTypeId(value);
    }

    return normalizeTypeId(type);
}

function getTypeName(type, index, pokemon) {
    if (typeof type === "object" && type !== null) {
        return type.name || TYPE_NAMES[getTypeId(type)] || type.id || "Normal";
    }

    const displayName = pokemon.typesDisplay?.[index];

    if (displayName) {
        return displayName;
    }

    return TYPE_NAMES[getTypeId(type)] || String(type ?? "Normal");
}


function getTypes(pokemon) {
    // Primeiro tenta os tipos próprios da forma especial.
    let sourceTypes = pokemon.types;

    // Se a forma não tiver tipos válidos, herda os tipos da espécie-base.
    if (!Array.isArray(sourceTypes) || sourceTypes.length === 0) {
        sourceTypes = pokemon._baseTypes || [];
    }

    // Compatibilidade com registros que guardam os tipos em typesDisplay.
    if (sourceTypes.length === 0 && Array.isArray(pokemon.typesDisplay)) {
        sourceTypes = pokemon.typesDisplay;
    }

    return sourceTypes
        .map((type, index) => {
            const rawId = getTypeId(type);
            const id = normalizeTypeId(rawId);

            const name =
                (typeof type === "object" && type !== null ? type.name : null) ||
                TYPE_NAMES[id] ||
                pokemon.typesDisplay?.[index] ||
                String(type ?? "");

            return { id, name };
        })
        .filter(type => type.id && type.name);
}

function getFeatures(pokemon) {
    const source = pokemon.specialForms || pokemon.features || {};

    if (Array.isArray(source)) {
        return source.reduce((result, form) => {
            if (form?.id) result[form.id] = true;
            return result;
        }, {});
    }

    return source;
}

function getDexNumber(pokemon) {
    return Number(pokemon.dexNumber ?? pokemon.number ?? 0);
}

function getRarity(pokemon) {
    return normalizeValue(pokemon.rarity || pokemon.classification || "");
}


function getCategory(pokemon) {
    const value = normalizeValue(
        pokemon.category || pokemon.classification || ""
    );

    if (
        value.includes("lendario") ||
        value.includes("legendary") ||
        value.includes("legend")
    ) {
        return "legendary";
    }

    if (
        value.includes("pseudolendario") ||
        value.includes("pseudo-legendary") ||
        value.includes("pseudo legendary") ||
        value.includes("pseudo")
    ) {
        return "pseudo";
    }

    if (
        value === "comum" ||
        value === "common" ||
        value === "normal"
    ) {
        return "common";
    }

    return "";
}

function showLoading() {
    if (loadingState) loadingState.hidden = false;
    if (emptyState) emptyState.hidden = true;
    if (errorState) errorState.hidden = true;
    if (pokemonGrid) pokemonGrid.replaceChildren();
}

function hideLoading() {
    if (loadingState) loadingState.hidden = true;
}

function showError(message) {
    hideLoading();

    if (errorState) {
        errorState.hidden = false;

        const paragraph = errorState.querySelector("p");
        if (paragraph) {
            paragraph.textContent = message;
        }
    }

    console.error(message);
}

async function fetchJSON(path) {
    const response = await fetch(path);

    if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}: ${path}`);
    }

    return response.json();
}


function normalizeTypeId(value) {
    const aliases = {
        grama: "grass",
        planta: "grass",
        fogo: "fire",
        agua: "water",
        eletrico: "electric",
        lutador: "fighting",
        voador: "flying",
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
        gelo: "ice",
        normal: "normal"
    };

    const normalized = normalizeValue(value);
    return aliases[normalized] || normalized;
}


async function loadPokemonDatabase() {
    showLoading();

    try {
        const data = await fetchJSON("data/pokemon.json");

        if (!Array.isArray(data)) {
            throw new Error("pokemon.json precisa conter uma lista JSON.");
        }

        basePokemonDatabase = data.map(pokemon => ({
            ...pokemon,
            dexNumber: getDexNumber(pokemon),
            types: pokemon.types || [],
            _entryType: "base"
        }));

        pokemonDatabase = [...basePokemonDatabase];

        // Carrega os dados detalhados para encontrar as formas especiais.
        // Uma falha em um arquivo individual não impede a lista principal.
        const detailedEntries = await Promise.all(
            pokemonDatabase.map(async pokemon => {
                try {
                    return await fetchJSON(
                        `data/pokemon-details/${pokemon.dexNumber}.json`
                    );
                } catch (error) {
                    console.warn(
                        `Detalhes não encontrados para #${pokemon.dexNumber}.`,
                        error
                    );
                    return null;
                }
            })
        );

        const baseNumbers = new Set(
            pokemonDatabase.map(pokemon => pokemon.dexNumber)
        );

        const specialEntries = [];

        detailedEntries.forEach((details, index) => {
            if (!details || !Array.isArray(details.specialForms)) return;

            const basePokemon = pokemonDatabase[index];

            details.specialForms.forEach(form => {
                if (!form?.id) return;

                // Ancient Warden é uma entrada independente (#157),
                // não uma forma de Sylvarion.
                if (
                    form.id === "ancient-warden" &&
                    baseNumbers.has(157)
                ) {
                    return;
                }

                const dexNumber = basePokemon.dexNumber;

                const suffix = form.id === "gigantamax"
                    ? "G"
                    : form.id === "tera"
                        ? "T"
                        : null;

                // Tipos originais do Pokémon.
                const baseTypes = basePokemon.types || [];

                // Se a forma tiver tipos próprios, utiliza-os.
                // Caso contrário, utiliza os tipos da espécie original.
                const formTypes =
                    Array.isArray(form.types) && form.types.length > 0
                        ? form.types
                        : baseTypes;

                // Identifica o Tipo Tera, caso exista.
                const teraType =
                    form.teraType ||
                    form.teraBattle?.type ||
                    null;

                // Normaliza os tipos para manter IDs e nomes consistentes.
                const normalizedFormTypes = formTypes.map(type => {
                    const typeId = getTypeId(type);

                    const typeName =
                        (
                            typeof type === "object" && type !== null
                                ? type.name
                                : null
                        ) ||
                        TYPE_NAMES[typeId] ||
                        String(type);

                    return {
                        id: typeId,
                        name: typeName
                    };
                });

                // Na Terastalização, adiciona o Tipo Tera como tipo extra,
                // sem duplicá-lo se já estiver presente.
                if (form.id === "tera" && teraType) {
                    const teraId = getTypeId(teraType);

                    const alreadyHasTeraType = normalizedFormTypes.some(
                        type => type.id === teraId
                    );

                    if (!alreadyHasTeraType) {
                        normalizedFormTypes.push({
                            id: teraId,
                            name: TYPE_NAMES[teraId] || String(teraType)
                        });
                    }
                }

                specialEntries.push({
                    ...basePokemon,

                    id: `${basePokemon.id || dexNumber}-${form.id}`,
                    name: form.name || basePokemon.name,
                    dexNumber,

                    displayNumber: form.displayNumber ||
                        (suffix
                            ? `#${dexNumber}-${suffix}`
                            : `#${dexNumber}`),

                    image: form.image || basePokemon.image,
                    category: form.type || "Forma especial",

                    // Tipos finais da forma, incluindo o Tipo Tera.
                    types: normalizedFormTypes,
                    typesDisplay: normalizedFormTypes.map(type => type.name),

                    // Preserva os tipos originais da espécie.
                    _baseTypes: baseTypes,

                    rarity: basePokemon.rarity,
                    registered: basePokemon.registered,

                    _entryType: "form",
                    _formId: form.id,
                    _formDescription: form.description || "",

                    // Guarda o Tipo Tera para uso em outras partes da interface.
                    _teraType: form.id === "tera" ? teraType : null
                });
            });
        });

        specialPokemonDatabase = specialEntries;

        // A listagem inicial continua mostrando apenas os Pokémon base.
        pokemonDatabase = [...basePokemonDatabase];

        populateTypeFilter();
        filterPokemon();

    } catch (error) {
        showError(
            "Não foi possível carregar a Pokédex. " +
            "Confira data/pokemon.json e o console do navegador."
        );

        console.error("Erro ao carregar a Pokédex:", error);
    }
}


function populateTypeFilter() {
    if (!typeFilter) return;

    const selectedValue = typeFilter.value || "all";

    const types = new Map(
        Object.entries(TYPE_NAMES).map(([id, name]) => [id, name])
    );

    pokemonDatabase.forEach(pokemon => {
        getTypes(pokemon).forEach(type => {
            if (!type.id) return;

            const id = normalizeTypeId(type.id);
            const name = TYPE_NAMES[id] || type.name;

            if (id && name) {
                types.set(id, name);
            }
        });
    });

    typeFilter.replaceChildren();

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "TODOS OS TIPOS";
    typeFilter.appendChild(allOption);

    [...types.entries()]
        .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))
        .forEach(([id, name]) => {
            const option = document.createElement("option");
            option.value = id;
            option.textContent = name;
            typeFilter.appendChild(option);
        });

    typeFilter.value = types.has(normalizeTypeId(selectedValue))
        ? normalizeTypeId(selectedValue)
        : "all";
}



function getFormFeature(pokemon) {
    const id = normalizeValue(pokemon._formId || "");
    const name = normalizeValue(pokemon.name || "");
    const description = normalizeValue(pokemon._formDescription || "");
    const category = normalizeValue(pokemon.category || "");

    const value = `${id} ${name} ${description} ${category}`;

    if (value.includes("mega")) return "mega";
    if (value.includes("gigantamax") || value.includes("g-max")) {
        return "gigantamax";
    }
    if (value.includes("paradox") || value.includes("paradoxo")) {
        return "paradox";
    }
    if (value.includes("tera") || value.includes("terastal")) {
        return "tera";
    }
    if (
        value.includes("regional") ||
        value.includes("alola") ||
        value.includes("galar") ||
        value.includes("hisui") ||
        value.includes("paldea")
    ) {
        return "regional";
    }

    return id;
}

function matchesFeature(pokemon, selectedFeature) {
    if (selectedFeature === "all") return true;

    if (pokemon._entryType === "form") {
        return getFormFeature(pokemon) === selectedFeature;
    }

    const features = getFeatures(pokemon);

    if (selectedFeature === "paradox") {
        return Boolean(features.paradox);
    }

    return Boolean(features[selectedFeature]);
}


function filterPokemon() {
    const search = normalizeValue(searchInput?.value || "");
    const selectedType = typeFilter?.value || "all";
    const selectedCategory = categoryFilter?.value || "all";
    const selectedFeature = specialFilter?.value || "all";
    const selectedStatus = statusFilter?.value || "all";

    const sourceDatabase = selectedFeature === "all"
        ? basePokemonDatabase
        : selectedFeature === "paradox"
            ? [
                ...basePokemonDatabase.filter(pokemon =>
                    Boolean(getFeatures(pokemon).paradox) ||
                    normalizeValue(pokemon.category).includes("paradox") ||
                    normalizeValue(pokemon.category).includes("paradoxo")
                ),
                ...specialPokemonDatabase.filter(pokemon =>
                    getFormFeature(pokemon) === "paradox"
                )
            ]
            : specialPokemonDatabase.filter(pokemon =>
                getFormFeature(pokemon) === selectedFeature
            );

    filteredPokemon = sourceDatabase.filter(pokemon => {
        const number = String(getDexNumber(pokemon));
        const displayNumber = normalizeValue(pokemon.displayNumber || "");

        const matchesSearch =
            !search ||
            normalizeValue(pokemon.name).includes(search) ||
            number.includes(search) ||
            displayNumber.includes(search);

        if (!matchesSearch) return false;

        if (selectedType !== "all") {
            const hasType = getTypes(pokemon).some(
                type => type.id === normalizeTypeId(selectedType)
            );

            if (!hasType) return false;
        }

        if (selectedCategory !== "all") {
            const selected = normalizeValue(selectedCategory);
            const rarity = getRarity(pokemon);
            const category = getCategory(pokemon);

            const commonValues = ["comum", "common", "normal"];
            const legendaryValues = ["lendario", "legendario", "legendary"];
            const pseudoValues = [
                "pseudolendario",
                "pseudo-legendary",
                "pseudo legendary",
                "pseudo"
            ];

            let matchesRarity = false;

            if (commonValues.includes(selected)) {
                matchesRarity =
                    commonValues.includes(rarity) ||
                    category === "common";
            } else if (legendaryValues.includes(selected)) {
                matchesRarity =
                    legendaryValues.includes(rarity) ||
                    category === "legendary";
            } else if (pseudoValues.includes(selected)) {
                matchesRarity =
                    pseudoValues.includes(rarity) ||
                    category === "pseudo";
            } else {
                matchesRarity = rarity === selected;
            }

            if (!matchesRarity) return false;
        }

        if (!matchesFeature(pokemon, selectedFeature)) {
            return false;
        }

        if (
            selectedStatus === "registered" &&
            pokemon.registered !== true
        ) {
            return false;
        }

        return true;
    });

    renderPokemon();
}



function createTypeBadges(pokemon) {
    const container = document.createElement("div");
    container.className = "pokemon-card-types";

    getTypes(pokemon).forEach((type, index) => {
        if (index > 0) {
            const separator = document.createElement("span");
            separator.className = "type-separator";
            separator.textContent = "•";
            separator.setAttribute("aria-hidden", "true");
            container.appendChild(separator);
        }

        const badge = document.createElement("span");
        badge.className = `type type-${type.id}`;
        badge.textContent = type.name;

        container.appendChild(badge);
    });

    return container;
}

function createFeatureBadges(pokemon) {
    const container = document.createElement("div");
    container.className = "pokemon-card-features";

    if (pokemon._entryType === "form") {
        const badge = document.createElement("span");
        badge.className = `feature-badge badge-${pokemon._formId}`;
        badge.textContent = FEATURE_NAMES[pokemon._formId] || "Forma especial";
        container.appendChild(badge);
    } else {
        const features = getFeatures(pokemon);

        Object.entries(FEATURE_NAMES).forEach(([key, label]) => {
            if (features[key] === true) {
                const badge = document.createElement("span");
                badge.className = `feature-badge badge-${key}`;
                badge.textContent = label;
                container.appendChild(badge);
            }
        });
    }

    return container;
}

function createPokemonCard(pokemon) {
    const card = document.createElement("article");
    card.className = "pokemon-card";
    card.tabIndex = 0;
    card.setAttribute("role", "link");

    const number = document.createElement("span");
    number.className = "pokemon-card-number";
    number.textContent = pokemon.displayNumber ||
        `#${String(getDexNumber(pokemon)).padStart(3, "0")}`;

    const imageContainer = document.createElement("div");
    imageContainer.className = "pokemon-card-image";

    const image = document.createElement("img");
    image.src = pokemon.image || "assets/pokemon-placeholder.png";
    image.alt = pokemon.name || "Pokémon";
    image.loading = "lazy";

    image.addEventListener("error", () => {
        if (!image.dataset.fallback) {
            image.dataset.fallback = "true";
            image.src = "assets/pokemon-placeholder.png";
        }
    });

    imageContainer.appendChild(image);

    const name = document.createElement("h2");
    name.className = "pokemon-card-name";
    name.textContent = pokemon.name || "Pokémon";

    const category = document.createElement("p");
    category.className = "pokemon-card-category";
    category.textContent = pokemon.category || "";

    card.append(
        number,
        imageContainer,
        name,
        category,
        createTypeBadges(pokemon),
        createFeatureBadges(pokemon)
    );

    function openCard() {
        const number = getDexNumber(pokemon);

        const url = new URL("pokemon.html", window.location.href);
        url.searchParams.set("id", String(number));

        if (pokemon._entryType === "form") {
            url.searchParams.set("form", pokemon._formId);
        }

        window.location.href = url.toString();
    }

    card.addEventListener("click", openCard);

    card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openCard();
        }
    });

    return card;
}

function renderPokemon() {
    hideLoading();

    if (!pokemonGrid) return;

    pokemonGrid.replaceChildren();

    if (emptyState) {
        emptyState.hidden = filteredPokemon.length !== 0;
    }

    filteredPokemon.forEach(pokemon => {
        pokemonGrid.appendChild(createPokemonCard(pokemon));
    });

    if (pokemonCount) {
        pokemonCount.textContent =
            String(filteredPokemon.length).padStart(3, "0");
    }
}

// CONTROLE DOS FILTROS RECOLHÍVEIS
const filtersToggle = document.getElementById("filters-toggle");
const filtersContent = document.getElementById("filters-content");

if (filtersToggle && filtersContent) {
filtersToggle.addEventListener("click", () => {
const isExpanded =
filtersToggle.getAttribute("aria-expanded") === "true";


    filtersToggle.setAttribute("aria-expanded", String(!isExpanded));
    filtersContent.hidden = isExpanded;
});


}

function setDexLoading(isLoading) {
const loading = document.getElementById("dex-loading");


if (loading) {
    loading.hidden = !isLoading;
}


}



function resetFilters() {
    if (searchInput) searchInput.value = "";
    if (typeFilter) typeFilter.value = "all";
    if (categoryFilter) categoryFilter.value = "all";
    if (specialFilter) specialFilter.value = "all";
    if (statusFilter) statusFilter.value = "all";

    filterPokemon();
}

searchInput?.addEventListener("input", filterPokemon);
typeFilter?.addEventListener("change", filterPokemon);
categoryFilter?.addEventListener("change", filterPokemon);
specialFilter?.addEventListener("change", filterPokemon);
statusFilter?.addEventListener("change", filterPokemon);
resetButton?.addEventListener("click", resetFilters);

document.addEventListener("DOMContentLoaded", loadPokemonDatabase);