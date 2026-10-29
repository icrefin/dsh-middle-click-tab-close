# dsh-middle-click-tab-close

**在 DeepSeek Harness 的右侧栏里，用鼠标中键关闭标签页** —— 浏览器给自己标签页的
那个手势，现在也适用于 dsh 为文件、终端、交付物和指南页打开的标签。

[English](README.md) | **简体中文**

[![License](https://img.shields.io/github/license/icrefin/dsh-middle-click-tab-close?style=flat-square)](LICENSE)
[![Release](https://img.shields.io/github/v/release/icrefin/dsh-middle-click-tab-close?style=flat-square)](https://github.com/icrefin/dsh-middle-click-tab-close/releases/tag/v0.1.0)
[![CI](https://img.shields.io/github/actions/workflow/status/icrefin/dsh-middle-click-tab-close/ci.yml?branch=main&style=flat-square)](https://github.com/icrefin/dsh-middle-click-tab-close/actions/workflows/ci.yml)
[![Last commit](https://img.shields.io/github/last-commit/icrefin/dsh-middle-click-tab-close?style=flat-square)](https://github.com/icrefin/dsh-middle-click-tab-close/commits/main)
[![Stars](https://img.shields.io/github/stars/icrefin/dsh-middle-click-tab-close?style=flat-square)](https://github.com/icrefin/dsh-middle-click-tab-close/stargazers)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](https://github.com/icrefin/dsh-middle-click-tab-close/pulls)
[![Node](https://img.shields.io/badge/node-%3E%3D22.17-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![dsh](https://img.shields.io/badge/dsh-0.2.1--rc.3-4B5563?style=flat-square)](https://github.com/deepseek-ai/deepseek-harness)

## 手势

```
右侧栏
┌──────────────────────────────────────────────────────────┐
│  Report ×   Guide   Terminal ×   +   ⬒   ⤢   ⌄          │
│        ↑                                                 │
│   在这里按中键即可关闭该标签，效果与 × 相同               │
└──────────────────────────────────────────────────────────┘
```

左键选中标签，右键打开标签菜单，**中键现在会关闭它** —— 停靠的标签条与浮窗标题都
一样。

## 为什么必须做成插件，而不是一个设置

标签条是 Harness 自带的 UI，没有任何位置留给「按标签生效的手势」：

| 所属包 | 它做什么 |
|---|---|
| `dsh-client-ui-dockkit` | 把每个标签画成 `role="tab"` 并带上 `data-dockkit-tab="<tab id>"`；它的标签处理器是 `onPointerDown: e => { if (e.button !== 2) onTabPressed(...) }` —— 只跳过右键这一种按键，所以中键只会选中标签，然后什么也不发生 |
| `dsh-client-ui-sidebar-right` | 拥有整列、标签注册表，并对外提供文档化的导航控制器 `ctx.sidebarRight.close(tabId)` |

没有任何用户设置能打开这个手势，也没有 slot 暴露标签本身。要在不 fork、不打补丁的
前提下加上它，唯一的办法是在页面里观察这个标签，并调用 UI 已经在用的那条关闭路径。

## 它贡献了什么

| 表面 | 作用 |
|---|---|
| `document` 上的一个捕获阶段 `pointerdown` 监听 | 解析被按下的标签并关闭它 |
| 宿主半边（`exports["."]`） | 空实现：只为让 Loader 行能携带浏览器半边 |
| Config、样式、slot、HTTP 路由 | 都没有 |

没有面板、没有设置卡片、没有 HTTP 表面。

## 一次按键的处理过程

| 步骤 | 发生什么 |
|---|---|
| 1 | 仅当 `button === 1`，且按下的位置在 `[data-sidebar-right-session]` 之内 |
| 2 | 从按下元素最近的 `[data-dockkit-tab]` 取到布局里的 tab id |
| 3 | 没有 `[data-dockkit-tab-close]` 的标签直接放过 —— 唯一的停靠指南页由自带 UI 保护 |
| 4 | 调用 `ctx.sidebarRight.close(tabId)`，走的是自带关闭路径：资源清理处理器、「最后一页关闭时收起整列」规则、布局撤销历史，都与点击标签上的 × 完全一致 |
| 5 | `preventDefault()` 阻止 Chromium 的中键自动滚动，`stopPropagation()` 让 dockkit 根本看不到这次按下 |
| 6 | 监听器放在 `ctx.effect` 里，插件被禁用或卸载时会一并移除 |

因为第 4 步走的是文档化控制器，而不是对 × 合成一次点击，所以标签类型注册的
`registerCloseHandler` 依然会执行；关掉某一格里最后一个标签时，仍然只产生一条历史
记录并收起整列。

## 为什么在 `document` 上捕获有效

React 18 把 `onPointerDown` 委托在根容器上，而根容器在捕获路径上位于 `document`
**之下**。因此在 `document` 上的捕获监听先执行；`stopPropagation()` 让事件到不了根
容器，dockkit 的标签处理器不会运行，也就不会开始拖拽。

`test/react-delegation.spec.tsx` 用 React 渲染标签并挂上真实的 `onPointerDown`，把
两件事都钉住了：中键永远不会到达该处理器，左键仍然会。

## 受保护的标签与浮窗

- **唯一的停靠指南页不会被关掉。** 它不画关闭控件，`sidebarRight.close()` 也会忽略
  它；插件同样拒绝这次按键，而不是无意义地吞掉事件。
- **浮窗没有标签 chip。** 它的标题是 `data-dockkit-float-title`，旁边才是关闭按钮；
  在标题上按中键等价于点击那个按钮 —— 走套件自己的关闭路径，浮窗照常关闭。

## 它不做什么

- 不用其它按键、手势或快捷键关闭标签。
- 不碰后台会话：只有前台这一列里可见的标签能被指针碰到。
- 依赖 dockkit 的 DOM 标记（`data-dockkit-tab`、`data-dockkit-tab-close`、
  `data-sidebar-right-session`）—— 这些正是 `ui-sidebar-right` 自己从 DOM 解析标签
  时用的标记。未来的 dsh 若改名，手势会安静地失效，而不会误关别的标签。
- 无法让手势变成原生行为：中键仍先到达浏览器，所以标签是在 `pointerdown` 时关闭，
  而不是 `auxclick`。

## 安装

在本仓库构建并打包：

```sh
pnpm install
pnpm check                       # typecheck · build · vitest
pnpm pack                        # -> dist/dsh-middle-click-tab-close-0.1.0.tgz
```

然后在 DeepSeek Harness 桌面版里打开 **Settings → Plugins**，安装
`dist/dsh-middle-click-tab-close-0.1.0.tgz`，并**重启应用**。运行中的 profile 无法
导入新加入的 bundle：它的模块路径不在启动时算好的解析表里，条目要到下次启动才生效。
重启之后网页端还需要刷新一次页面。

## 开发

```sh
pnpm install
pnpm check          # 宿主半边、浏览器半边与测试的 typecheck；构建；vitest
```

想在不碰应用所用 profile 的前提下看到包被组合与分发：

```sh
scripts/dev-profile.sh boot 19498     # 隔离的 DSH home，位于 .dev-home/
scripts/dev-profile.sh url 19498      # 打印被分发的 bundle URL
scripts/dev-profile.sh remove
```

手势本身仍靠人工在浏览器里确认：打开右侧栏、对标签按中键，确认标签关闭且关闭处理器
被执行。

## 验证情况

| 层级 | 结果 |
|---|---|
| Typecheck：宿主半边、浏览器半边、测试 | 通过 |
| 构建后的 `lib/client.js` 放在假的 `window.__ModuleLoader__` 后执行 | 以包名注册，导出 `apply` 与 `inject: ['sidebarRight']` |
| jsdom 中针对构建产物的行为测试 | 可关闭的标签、标题与关闭控件上的按键、受保护的指南页、侧栏之外、其它按键、浮窗、监听器释放 |
| React 18 委托顺序 | 中键永远到不了标签的 `onPointerDown`；左键仍然会 |
| 在隔离的 dsh profile 中组合 | Loader 行已组合、boot 图谱带有该条目及其 `inject`、bundle 可被分发 |
| 桌面 GUI 里的真实中键 | **未自动化** —— 留给人工确认的最后一项 |

## 文件

```
src/
├── index.ts              # 宿主半边：Loader 行的空入口
└── client/index.ts       # document 监听、标签解析、关闭调用
test/
├── loader.ts             # 把构建产物放进假的模块加载器
├── bundle.spec.ts        # loader id 与导出
├── middle-click.spec.ts  # jsdom 里的手势
└── react-delegation.spec.tsx  # 捕获先于 React 的证明
scripts/
├── dev-profile.sh        # 用于组合检查的隔离 dsh home
└── install.sh            # 打包并打印安装路径
```

## 参与贡献

欢迎提交 issue 与 pull request —— bug 表单会问「按键的哪一步坏了」，通常足够复现。
命令与每个测试文件固定了什么，见 [CONTRIBUTING.md](.github/CONTRIBUTING.md)。安全
问题请走 [SECURITY.md](.github/SECURITY.md)，不要开公开 issue。本项目遵循
[Contributor Covenant](.github/CODE_OF_CONDUCT.md)。

> 如果它替你省下了每次去点 × 的那一下，一颗 ⭐ 能让更多 DSH 用户找到它。

## 许可证

MIT —— 见 [LICENSE](LICENSE)。
