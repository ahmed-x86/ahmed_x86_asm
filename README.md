# 🚀 ahmed_x86_asm

A powerful, all-in-one Visual Studio Code / VSCodium extension to instantly compile and run **x86/x64 Assembly** code directly from your editor. Now supporting both **Linux** and **Windows** with a seamless workflow for native and cross-platform Assembly development.

## ✨ Features

- **One-Click Execution**: Integrated directly into the editor's Run button menu.
- **Smart OS Detection**: Automatically detects your operating system and provides the appropriate build tools and commands.
- **Linux Build Modes (10 Options)**:
  1. Linux64 Native (`_start`)
  2. Linux64 Native (`main`)
  3. Linux32 Native (`_start`)
  4. Linux32 Native (`main`)
  5. Win32 Irvine (via Wine)
  6. Win32 Standalone (via Wine)
  7. Win64 Standalone (via Wine)
  8. Win32 Irvine (`main`)
  9. Win32 Standalone (`main`)
  10. Win64 Standalone (`main`)
- **Windows Build Modes (6 Options)**:
  1. Win32 Irvine (Standard)
  2. Win32 Standalone (Standard)
  3. Win64 Standalone (Standard)
  4. Win32 Irvine (Custom main)
  5. Win32 Standalone (Custom main)
  6. Win64 Standalone (Custom main)
- **Multi-Assembler Support**: Smartly utilizes `NASM` for standalone builds and `UASM` for Irvine library projects.
- **Broad Compatibility**: Automatically detects a wide range of assembly extensions (`.asm`, `.s`, `.S`, `.inc`, `.nasm`, `.masm`, `.uasm`) and language identifiers.

## 🛠️ Requirements

### 🐧 For Linux Users:
Ensure your system has the following dependencies installed:
- `nasm` (For standard Linux/Windows builds)
- `uasm` (For Irvine library support)
- `binutils` (Provides `ld` for Linux linking)
- `mingw-w64-gcc` (For linking Windows executables)
- `wine` (To run compiled Windows `.exe` files seamlessly on Linux)
- *Note: Ensure the Irvine library is located at `~/Irvine/irvine` if you plan to use it.*

### 🪟 For Windows Users:
Ensure your system has an **MSYS2** environment set up with the following:
- `MSYS2` installed at `C:\msys64`
- `mingw-w64-x86_64-gcc` and `mingw-w64-i686-gcc` toolchains.
- `nasm.exe` and `uasm.exe` placed in your MinGW bin directories (`C:\msys64\mingw64\bin`).
- *Note: Ensure the Irvine library is located at `C:\irvine` if you plan to use it.*

*(Note: The extension will alert you if you attempt to run it on an unsupported OS like macOS).*

## 🎯 How to Use

1. Open any Assembly file in VSCodium / VS Code.
2. Click the drop-down arrow next to the **Play (Run)** button in the top right corner.
3. Select **Run x86 Assembly (ahmed_x86)**.
4. Choose your desired build mode from the Quick Pick menu.
5. Watch the magic happen in the integrated terminal!

## 👨‍💻 Author

Created with by **ahmed-x86**