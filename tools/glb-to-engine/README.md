# Модель MakeHuman → тело для движка «Оси»

Движок рисует одно тело с 17 костями (свой скелет, сантиметры, лицо смотрит в +Z, левая сторона — +X).
Конвертер берёт модель из Blender (MPFB 2, скелет Game engine), переставляет её в исходную позу движка
и записывает данные в `src/data/body-male.js` и ещё три файла рядом (`-2`, `-3`, `-4`): приложение Claude на телефоне не загружает файл больше примерно 1 МБ, поэтому тело разбито на части по ~0,5 МБ.

## Как обновить модель

1. Blender + MPFB 2: человек → кожа → скелет **Game engine** → глаза, брови.
   Экспорт: Файл → Экспорт → glTF 2.0 (.glb), изображения JPEG.
2. Положить файл в `assets/models/` (сейчас там `makehuman-male.glb`).
3. Выгрузить исходную позу движка (нужен Node.js и установленные зависимости проекта):
   `node tools/glb-to-engine/dump-engine-rest.js`
4. Конвертировать (нужен Python 3 с numpy, scipy и Pillow: `pip install numpy scipy pillow`):
   `python tools/glb-to-engine/convert.py assets/models/makehuman-male.glb tools/glb-to-engine/engine_rest.json src/data/body-male.js assets/models/hair/short02 assets/models/hm08-base.obj`
   Последние два параметра — причёска MakeHuman (папка с `.mhclo`, `.obj` и `_diffuse.png`) и базовая сетка `hm08`,
   по которой она подогнана. Без них тело будет без волос.

   Текущее атлетичное тело собрано так (формы MakeHuman, CC0, лежат в `assets/models/targets`):
   ```
   GLUTE_KEEP=0.9 MH_MUSCLE=1.0 MH_WEIGHT=0.45 \
   MH_EXTRA="torso-vshape-incr:0.6,torso-muscle-pectoral-incr:0.8,torso-muscle-dorsi-incr:0.7,torso-scale-horiz-incr:0.15,neck-scale-horiz-incr:0.5,r-upperarm-muscle-incr:0.9,l-upperarm-muscle-incr:0.9,r-upperarm-shoulder-muscle-incr:0.9,l-upperarm-shoulder-muscle-incr:0.9,r-lowerarm-muscle-incr:0.7,l-lowerarm-muscle-incr:0.7,r-upperleg-muscle-incr:0.8,l-upperleg-muscle-incr:0.8,r-lowerleg-muscle-incr:0.6,l-lowerleg-muscle-incr:0.6" \
   python tools/glb-to-engine/convert.py ...   # те же параметры, что выше
   ```
   `MH_MUSCLE` и `MH_WEIGHT` — как ползунки «Мышцы» и «Вес» в MakeHuman (0.5 — как в файле), `MH_EXTRA` — отдельные формы с весами.
5. `npm test` и посмотреть глазами несколько упражнений.

Шаги 3–4 нужно повторять, если меняется скелет движка (`B`, `REST` в `src/engine/mannequin.js` и `src/engine/rig.js`).

## Что делает конвертер

- берёт только оболочку тела (самый большой связный кусок): служебные детали MPFB отбрасываются, даже если при экспорте не применены модификаторы;
- применяет формы тела (morph targets) с их весами;
- конечности ставит по осям костей движка с растяжением вдоль кости, чтобы суставы совпали; торс выравнивает по бёдрам и плечам; голова сохраняет свой размер;
- веса MakeHuman суммирует по 17 костям движка;
- майку, шорты и волокна мышц для анатомического режима считает по этой же модели;
- сохраняет текстуру кожи из модели (JPEG 1024 px) и UV-развёртку, швы развёртки не склеивает;
- брови из модели и причёску MakeHuman (`.mhclo`) записывает отдельными частями `parts` со своими текстурами, они крепятся к кости головы;
- положение глаз записывает в `feat` (их рисует `src/engine/webgl.js`).

Причёска `assets/models/hair/short02` и сетка `assets/models/hm08-base.obj` — из набора «MakeHuman system assets»
(https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html) и репозитория MPFB 2, лицензия CC0.
Другую причёску из набора можно подставить той же командой.

Женской модели пока нет: `glbData()` в `src/engine/webgl.js` подключает только `window.OS3H_M`.
