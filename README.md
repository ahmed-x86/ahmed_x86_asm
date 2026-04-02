# 🚀 ahmed_x86_asm

A powerful, all-in-one Visual Studio Code / VSCodium extension to instantly compile and run **x86 Assembly** code directly from your editor. Built specifically for Linux users who need a seamless workflow for both native and cross-platform Assembly development.

## ✨ Features

- **One-Click Execution**: Integrated directly into the editor's Run button menu.
- **10 Build Modes**: Covers almost every scenario you need for x86/x86_64 development:
  1. Linux64 Native (`_start`)
  2. Linux64 Native (`main`)
  3. Linux32 Native (`_start`)
  4. Linux32 Native (`main`)
  5. Win32 Irvine
  6. Win32 Standalone
  7. Win64 Standalone
  8. Win32 Irvine (`main`)
  9. Win32 Standalone (`main`)
  10. Win64 Standalone (`main`)
- **Cross-Platform Compilation**: Write Windows Assembly on Linux and run it instantly using `mingw` and `wine`.
- **Multi-Assembler Support**: Smartly utilizes `NASM` for standalone builds and `UASM` for Irvine library projects.
- **Broad Compatibility**: Automatically detects a wide range of assembly extensions (`.asm`, `.s`, `.S`, `.inc`, `.nasm`, `.masm`, `.uasm`) and language identifiers (`fasm`, `gas`, `x86`, etc.).

## 🛠️ Requirements

To get the most out of this extension, ensure your Linux system has the following dependencies installed (depending on the build modes you plan to use):

- `nasm` (For standard Linux/Windows builds)
- `uasm` (For Irvine library support)
- `binutils` (Provides `ld` for Linux linking)
- `mingw-w64-gcc` (For linking Windows executables)
- `wine` (To run compiled Windows `.exe` files seamlessly on Linux)

*(Note: The extension will alert you if you attempt to run it on a non-Linux OS).*

## 🎯 How to Use

1. Open any Assembly file in VSCodium.
2. Click the drop-down arrow next to the **Play (Run)** button in the top right corner.
3. Select **Run x86 Assembly (ahmed_x86)**.
4. Choose your desired build mode from the Quick Pick menu.
5. Watch the magic happen in the integrated terminal!

## 👨‍💻 Author

Created with by **ahmed-x86** 