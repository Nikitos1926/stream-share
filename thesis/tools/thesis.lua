--[[
thesis.lua — pandoc Lua filter for the stream-share thesis (thesis/PLAN.md §1.6–1.11, §4.3).

  * Numbers figures, tables, listings, formulas and scenarios per chapter. The chapter label is
    the leading number of the current level-1 heading («# 3 Проєктування…» → 3) or the appendix
    letter («# Додаток А …» → А); objects under an unnumbered element (Вступ…) get plain 1, 2…
      ![Назва](../diagrams/fig-x.png){#fig:x}            → «Рисунок 3.1 – Назва» below, centred
      : Назва {#tbl:x}                                    → «Таблиця 2.1 – Назва» above
      ```{#lst:x .ts caption="Назва"}                    → «Лістинг 4.1 – Назва» above
      ::: {#eq:x} $$…$$ :::                               → formula centred, «(2.1)» at the right
      ::: {#sc:x caption="Назва"} … :::                   → «Сценарій 1.1 – Назва» above, ruled
                                                             body, lists as typed «N. » (§0.4)
  * Inline code `x` is rendered as plain body text (PLAN.md §0.2); listings keep Courier New.
  * Resolves @fig:/@tbl:/@lst:/@sc: to «3.1» and @eq: to «(2.1)». An unknown target (e.g. a table
    of a chapter not written yet) prints a warning and renders «??»; THESIS_STRICT=1 makes it an error.
  * Renders [@key] / [@a; @b, с. 15] / @key from sources.yaml as «[1]», «[1, 2]», «[2, с. 15]»,
    numbered in order of first citation, and writes the ДСТУ 8302:2015 list («1. <text>») into
    `::: {#refs} :::`, or after the «# Список використаних джерел» heading, or — if neither
    exists — under a new such heading before the first appendix (or at the end).
    An unknown source key is always a build error.
  Sources file: metadata `thesis-sources` (path), default <this file's dir>/../sources.yaml.
  Every source should be cited (PLAN.md §1.11): uncited keys are warned about unless
  `thesis-unused-ok` is set (the fixture build sets it).
]]

local KINDS = { fig = "Рисунок", tbl = "Таблиця", lst = "Лістинг", sc = "Сценарій", eq = "" }
local CAPTION_STYLE = "Table Caption" -- listing captions look like table captions
-- Scenario layout (PLAN.md §0.4): caption, rule, flush-left body, rule. The rules are paragraph
-- borders of the first/last body paragraph (make_reference_docx.py); a one-paragraph scenario
-- gets both. Word merges equal borders of adjacent paragraphs, hence four body styles.
local SC_CAPTION_STYLE = "Scenario Caption"
local SC_STYLES = { first = "Scenario First", mid = "Scenario", last = "Scenario Last",
  single = "Scenario Single" }
local FORMULA_STYLE = "Formula"       -- reference.docx: centre tab + right tab (make_reference_docx.py)
local REFS_TITLE = "Список використаних джерел"

local strict = os.getenv("THESIS_STRICT") == "1"
local errors, warnings = {}, {}
local function err(msg) errors[#errors + 1] = msg end
local function warn(msg) warnings[#warnings + 1] = msg end

local stringify = pandoc.utils.stringify
local lower = pandoc.text.lower

-- ---------------------------------------------------------------- sources.yaml
local function script_dir()
  return (PANDOC_SCRIPT_FILE or ""):match("^(.*)[/\\]") or "."
end

local function load_sources(meta)
  local path = meta["thesis-sources"] and stringify(meta["thesis-sources"])
      or (script_dir() .. "/../sources.yaml")
  local fh = io.open(path, "r")
  if not fh then
    err("cannot open sources file " .. path)
    return {}, {}
  end
  local text = fh:read("a")
  fh:close()
  -- Let pandoc parse the YAML (as a metadata block); `smart` off keeps the strings verbatim.
  local parsed = pandoc.read("---\n" .. text .. "\n---\n", "markdown-smart")
  local list = parsed.meta.sources or {}
  local byKey, order = {}, {}
  for _, entry in ipairs(list) do
    local key = entry.key and stringify(entry.key)
    if not key or not entry.text then
      err(path .. ": every entry needs `key` and `text`")
    elseif byKey[key] then
      err(path .. ": duplicate key " .. key)
    else
      byKey[key] = entry.text -- MetaInlines
      order[#order + 1] = key
    end
  end
  return byKey, order
end

-- ---------------------------------------------------------------- helpers
local function kind_of(id)
  local k = id and id:match("^(%a+):")
  if k and KINDS[k] then return k end
  return nil
end

-- «: Назва {#tbl:x}» — pandoc 3.8 leaves the attribute as text at the end of the caption.
-- Returns the id and the caption blocks without it.
local function table_caption_id(tbl)
  local blocks = tbl.caption.long
  if #blocks == 0 then return nil end
  local last = blocks[#blocks]
  if last.t ~= "Plain" and last.t ~= "Para" then return nil end
  local inl = last.content
  -- find the Str starting with "{#" scanning backwards
  for i = #inl, 1, -1 do
    if inl[i].t == "Str" and inl[i].text:match("^{#") then
      local attr = stringify(pandoc.Inlines({ table.unpack(inl, i) }))
      local id = attr:match("^{#([^%s}]+)")
      if not id or not attr:match("}%s*$") then return nil end
      local kept = pandoc.Inlines({ table.unpack(inl, 1, i - 1) })
      while #kept > 0 and (kept[#kept].t == "Space" or kept[#kept].t == "SoftBreak") do
        kept:remove(#kept)
      end
      local newblocks = pandoc.Blocks({ table.unpack(blocks, 1, #blocks - 1) })
      newblocks:insert(pandoc.Plain(kept))
      return id, newblocks
    end
  end
  if tbl.identifier and tbl.identifier ~= "" then return tbl.identifier, blocks end
  return nil
end

-- «Рисунок 3.1 – Назва»: label, en dash with spaces (PLAN.md §1.6), caption text.
local function prefix_inlines(label, inlines)
  local out = pandoc.Inlines({ pandoc.Str(label), pandoc.Space(), pandoc.Str("–"), pandoc.Space() })
  out:extend(inlines)
  return out
end

local function caption_para(label, text_inlines)
  return pandoc.Div({ pandoc.Para(prefix_inlines(label, text_inlines)) },
    { ["custom-style"] = CAPTION_STYLE })
end

-- ---------------------------------------------------------------- pass 1: numbering + order
local SOURCES = {}     -- key -> MetaInlines (ДСТУ string)
local labels = {}      -- id -> "3.1"
local cite_order = {}  -- source keys in order of first citation
local cite_num = {}    -- key -> n

local function number_objects(doc, sources)
  local chapter = nil
  local counters = {}

  local function assign(id, where)
    local kind = kind_of(id)
    if not kind then return end
    if labels[id] then
      err("duplicate id " .. id .. " (" .. where .. ")")
      return
    end
    counters[kind] = (counters[kind] or 0) + 1
    labels[id] = chapter and (chapter .. "." .. counters[kind]) or tostring(counters[kind])
  end

  doc:walk({
    traverse = "topdown",
    Header = function(h)
      if h.level == 1 then
        local text = stringify(h.content)
        local num = text:match("^(%d+)%s")
        local letter = lower(text):match("^додаток%s+(%S+)")
        if num then
          chapter = num
        elseif letter then
          chapter = pandoc.text.upper(letter)
        else
          chapter = nil
        end
        counters = {}
      end
    end,
    Figure = function(f) assign(f.identifier, "figure") end,
    Table = function(t)
      local id = table_caption_id(t)
      if id then assign(id, "table") end
    end,
    CodeBlock = function(c) assign(c.identifier, "listing") end,
    Div = function(d) assign(d.identifier, "div") end,
    Cite = function(c)
      for _, citation in ipairs(c.citations) do
        local id = citation.id
        if not kind_of(id) and sources[id] and not cite_num[id] then
          cite_order[#cite_order + 1] = id
          cite_num[id] = #cite_order
        end
      end
    end,
  })
end

-- ---------------------------------------------------------------- pass 2: rendering
local function render_cite(c, sources)
  local xrefs, srcs = 0, 0
  for _, citation in ipairs(c.citations) do
    if kind_of(citation.id) then xrefs = xrefs + 1 else srcs = srcs + 1 end
  end
  if xrefs > 0 and srcs > 0 then
    err("mixed cross-reference and source in one citation: " .. stringify(c.content))
    return nil
  end

  if xrefs > 0 then
    local out = pandoc.Inlines({})
    for i, citation in ipairs(c.citations) do
      if i > 1 then out:extend({ pandoc.Str(","), pandoc.Space() }) end
      local id = citation.id
      local label = labels[id]
      if not label then
        local msg = "unknown cross-reference @" .. id
        if strict then err(msg) else warn(msg) end
        label = "??"
      end
      if kind_of(id) == "eq" then label = "(" .. label .. ")" end
      out:extend(citation.prefix)
      out:insert(pandoc.Str(label))
      out:extend(citation.suffix)
    end
    return out
  end

  local items, plain = {}, true
  for _, citation in ipairs(c.citations) do
    local key = citation.id
    if not sources[key] then
      err("unknown source key @" .. key .. " — add it to sources.yaml, or escape a literal @ as \\@")
      return nil
    end
    if #citation.prefix > 0 or #citation.suffix > 0 then plain = false end
    items[#items + 1] = { n = cite_num[key], citation = citation }
  end
  if plain then table.sort(items, function(a, b) return a.n < b.n end) end
  local out = pandoc.Inlines({ pandoc.Str("[") })
  for i, item in ipairs(items) do
    if i > 1 then out:extend({ pandoc.Str(","), pandoc.Space() }) end
    out:extend(item.citation.prefix)
    out:insert(pandoc.Str(tostring(item.n)))
    out:extend(item.citation.suffix) -- pandoc keeps the leading «,» of «, с. 15»
  end
  out:insert(pandoc.Str("]"))
  return out
end

-- Scenario body: Markdown lists become typed «N. » paragraphs (not Word auto-lists), every
-- paragraph gets a scenario style so it is flush left and the first/last carry the rules.
local function scenario_body(blocks)
  local paras = pandoc.List({})
  local function add_inlines(inl) paras:insert(pandoc.Para(inl)) end
  for _, b in ipairs(blocks) do
    if b.t == "Para" or b.t == "Plain" then
      add_inlines(b.content)
    elseif b.t == "OrderedList" then
      local n = b.listAttributes.start or 1
      for _, item in ipairs(b.content) do
        local inl = pandoc.Inlines({ pandoc.Str(n .. "."), pandoc.Space() })
        inl:extend(pandoc.utils.blocks_to_inlines(item))
        add_inlines(inl)
        n = n + 1
      end
    elseif b.t == "BulletList" then
      for _, item in ipairs(b.content) do
        local inl = pandoc.Inlines({ pandoc.Str("–"), pandoc.Space() })
        inl:extend(pandoc.utils.blocks_to_inlines(item))
        add_inlines(inl)
      end
    else
      err("scenario: unsupported block " .. b.t .. " (use paragraphs and lists only)")
    end
  end
  local out = pandoc.Blocks({})
  for i, p in ipairs(paras) do
    local st = (#paras == 1 and SC_STYLES.single) or (i == 1 and SC_STYLES.first)
        or (i == #paras and SC_STYLES.last) or SC_STYLES.mid
    out:insert(pandoc.Div({ p }, { ["custom-style"] = st }))
  end
  return out
end

local function formula_block(div)
  local inl = pandoc.Inlines({})
  pandoc.Div(div.content):walk({
    Math = function(m)
      inl:insert(pandoc.Math("InlineMath", m.text))
      return m
    end,
  })
  if #inl == 0 then
    err("formula " .. div.identifier .. " has no $$…$$ math")
    return nil
  end
  local tab = FORMAT:match("docx") and pandoc.RawInline("openxml", "<w:r><w:tab/></w:r>")
      or pandoc.Space()
  local para = pandoc.Inlines({ tab })
  para:extend(inl)
  para:extend({ tab, pandoc.Str("(" .. labels[div.identifier] .. ")") })
  return pandoc.Div({ pandoc.Para(para) }, { ["custom-style"] = FORMULA_STYLE })
end

local function reference_list()
  local blocks = pandoc.Blocks({})
  for n, key in ipairs(cite_order) do
    local inl = pandoc.Inlines({ pandoc.Str(n .. "."), pandoc.Space() })
    inl:extend(pandoc.Inlines(SOURCES[key]))
    blocks:insert(pandoc.Para(inl))
  end
  return blocks
end

local function place_references(blocks)
  local list = reference_list()
  -- 1) ::: {#refs} :::
  for i, b in ipairs(blocks) do
    if b.t == "Div" and b.identifier == "refs" then
      blocks[i] = pandoc.Div(list, { id = "refs" })
      return blocks
    end
  end
  -- 2) existing heading
  for i, b in ipairs(blocks) do
    if b.t == "Header" and b.level == 1 and lower(stringify(b.content)) == lower(REFS_TITLE) then
      for j = #list, 1, -1 do blocks:insert(i + 1, list[j]) end
      return blocks
    end
  end
  -- 3) new heading before the first appendix, or at the end
  local at = #blocks + 1
  for i, b in ipairs(blocks) do
    if b.t == "Header" and b.level == 1 and lower(stringify(b.content)):match("^додаток") then
      at = i
      break
    end
  end
  local section = pandoc.Blocks({ pandoc.Header(1, REFS_TITLE) })
  section:extend(list)
  for j = #section, 1, -1 do blocks:insert(at, section[j]) end
  return blocks
end

function Pandoc(doc)
  local sources, order = load_sources(doc.meta)
  SOURCES = sources
  number_objects(doc, sources)

  doc = doc:walk({
    Figure = function(f)
      local label = labels[f.identifier]
      if not label then return nil end
      local blocks = f.caption.long
      if #blocks == 0 then
        err("figure " .. f.identifier .. " has no caption")
        return nil
      end
      f.caption.long = pandoc.Blocks({ pandoc.Plain(prefix_inlines("Рисунок " .. label,
        pandoc.utils.blocks_to_inlines(blocks))) })
      return f
    end,
    Table = function(t)
      local id, blocks = table_caption_id(t)
      if not id or not labels[id] then return nil end
      t.identifier = id
      t.caption.long = pandoc.Blocks({ pandoc.Plain(prefix_inlines("Таблиця " .. labels[id],
        pandoc.utils.blocks_to_inlines(blocks))) })
      return t
    end,
    CodeBlock = function(c)
      local label = labels[c.identifier]
      if not label then return nil end
      local cap = c.attributes.caption
      if not cap or cap == "" then
        err("listing " .. c.identifier .. " needs caption=\"…\"")
        return nil
      end
      c.attributes.caption = nil
      local capinl = pandoc.utils.blocks_to_inlines(pandoc.read(cap, "markdown-smart").blocks)
      return { caption_para("Лістинг " .. label, capinl), c }
    end,
    Div = function(d)
      local kind = kind_of(d.identifier)
      if kind == "eq" then return formula_block(d) end
      if kind == "sc" then
        local cap = d.attributes.caption
        if not cap or cap == "" then
          err("scenario " .. d.identifier .. " needs caption=\"…\"")
          return nil
        end
        local capinl = pandoc.utils.blocks_to_inlines(pandoc.read(cap, "markdown-smart").blocks)
        local out = pandoc.Blocks({ pandoc.Div({ pandoc.Para(prefix_inlines(
          "Сценарій " .. labels[d.identifier], capinl)) }, { ["custom-style"] = SC_CAPTION_STYLE }) })
        out:extend(scenario_body(d.content))
        return out
      end
      return nil
    end,
    Cite = function(c) return render_cite(c, sources) end,
  })

  doc.blocks = place_references(doc.blocks)

  -- PLAN.md §0.2: identifiers are body text. Inline code (also in captions and table cells)
  -- loses its monospace style; fenced listings (CodeBlock) are untouched.
  doc = doc:walk({ Code = function(c) return pandoc.Str(c.text) end })

  local unused = {}
  for _, key in ipairs(order) do
    if not cite_num[key] then unused[#unused + 1] = key end
  end
  if #unused > 0 and not doc.meta["thesis-unused-ok"] then
    warn("sources never cited: " .. table.concat(unused, ", "))
  end

  for _, w in ipairs(warnings) do io.stderr:write("thesis.lua: warning: " .. w .. "\n") end
  io.stderr:write(string.format("thesis.lua: %d numbered objects, %d sources cited\n",
    (function() local n = 0; for _ in pairs(labels) do n = n + 1 end; return n end)(), #cite_order))
  if #errors > 0 then
    for _, e in ipairs(errors) do io.stderr:write("thesis.lua: error: " .. e .. "\n") end
    error(#errors .. " error(s) in the thesis sources")
  end
  return doc
end
