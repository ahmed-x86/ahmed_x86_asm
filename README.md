# 🚀 ahmed_x86_asm

A powerful, all-in-one Visual Studio Code / VSCodium extension to instantly compile and run **x86/x64 Assembly** code directly from your editor. Now supporting both **Linux** and **Windows** with a seamless workflow for native and cross-platform Assembly development.

## ✨ Features

- **🤖 Smart Auto-Detect**: Automatically analyzes your code keywords (like `Irvine32`, `GetStdHandle`, `_start`) to instantly recommend the perfect build mode, including cross-compilation scenarios.
- **📝 Quick Snippets**: Instantly generate full assembly boilerplate code using fast prefix keywords (see Snippets section).
- **🧹 Auto-Clear Terminal**: Keeps your workspace clean by automatically clearing the terminal before every new run.
- **⚡ One-Click Execution**: Integrated directly into the editor's Run button menu.
- **🧠 Dynamic Irvine Path**: Prompts you to select your Irvine library folder only once and saves it globally. (Includes a reset command if you move your folder).
- **Linux Build Modes (10 Options)**: Includes Native 32/64-bit and cross-compiling Win32/Win64 via Wine.
- **Windows Build Modes (6 Options)**: Includes Standard and Custom `main` configurations.
- **Multi-Assembler Support**: Smartly utilizes `NASM` for standalone builds and `UASM` for Irvine library projects.
- **Broad Compatibility**: Automatically detects a wide range of assembly extensions (`.asm`, `.s`, `.S`, `.inc`, `.nasm`, `.masm`, `.uasm`).

## 📝 Snippets & Templates

Stop writing boilerplate from scratch! Type any of the following prefixes in an empty `.asm` file and press `Tab` or `Enter` to generate a complete template:

### 🐧 Linux Native Templates
| Prefix | Description |
| :--- | :--- |
| `linux32-main` | Linux 32-bit boilerplate using `main` |
| `linux32-start` | Linux 32-bit boilerplate using `_start` |
| `linux64-main` | Linux 64-bit boilerplate using `main` |
| `linux64-start` / `arch-start` | Linux 64-bit boilerplate using `_start` (Prints "i use Archlinux BTW") |

### 📚 Irvine32 Templates
| Prefix | Description |
| :--- | :--- |
| `win32-irvine-main` | Standard Win32 Irvine boilerplate |
| `win32-irvine` | Win32 Irvine boilerplate (Prints Arch message) |

### 🪟 Windows API / Standalone Templates
| Prefix | Description |
| :--- | :--- |
| `win32-std-main` | Win32 pure Windows API using `main` |
| `win32-std-start` | Win32 pure Windows API using `_start` |
| `win64-std-main` | Win64 pure Windows API using `main` |
| `win64-std-start` | Win64 pure Windows API using `_start` |

## 🛠️ Requirements

### 🐧 For Linux Users:
Ensure your system has the following dependencies installed:
- `nasm` (For standard Linux/Windows builds)
- `uasm` (For Irvine library support)
- `binutils` (Provides `ld` for Linux linking)
- `mingw-w64-gcc` (For linking Windows executables)
- `wine` (To run compiled Windows `.exe` files seamlessly on Linux)

### 🪟 For Windows Users:
Ensure your system has an **MSYS2** environment set up with the following:
- `MSYS2` installed at `C:\msys64`
- `mingw-w64-x86_64-gcc` and `mingw-w64-i686-gcc` toolchains.
- `nasm.exe` and `uasm.exe` placed in your MinGW bin directories (`C:\msys64\mingw64\bin`).

*(Note: The extension will alert you if you attempt to run it on an unsupported OS like macOS).*

## 🎯 How to Use

1. Open any Assembly file in VSCodium / VS Code.
2. Type a snippet prefix (e.g., `arch-start`) and press `Tab` to instantly load a template.
3. Click the drop-down arrow next to the **Play (Run)** button in the top right corner.
4. Select **Run x86 Assembly (ahmed_x86)**.
5. Choose the **✨ Auto Detect** option (or manually select a build mode).
6. Watch the magic happen in the integrated, auto-cleaned terminal!

## 👨‍💻 Author

Created with by **ahmed-x86**