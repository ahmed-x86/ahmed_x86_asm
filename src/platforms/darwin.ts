import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';
import { runCmd, cleanUpTempFiles } from '../utils';
import { assembleAndDiagnose } from '../diagnostics';

// 1. دالة فحص الاعتماديات الخاصة بالماك
export async function checkMacDeps() {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "ahmed-x86 ASM:",
        cancellable: false
    }, async (progress) => {

        let messageItems: string[] = [];
        let hasMissing = false;
        progress.report({ message: "Checking dependencies..." });

        const deps = [
            { name: 'clang/llvm', cmd: 'clang --version' }
        ];

        const total = deps.length;
        for (let i = 0; i < total; i++) {
            const dep = deps[i];
            progress.report({ message: `Checking ${dep.name}...`, increment: (100 / total) });

            const res = await runCmd(dep.cmd);
            if (res.success && res.output) {
                messageItems.push(`${dep.name} : Installed ✅`);
            } else {
                messageItems.push(`${dep.name} : Not Installed ❌ (Install Xcode Command Line Tools)`);
                hasMissing = true;
            }
        }

        if (hasMissing) {
            messageItems.push("for install package");
        }

        if (messageItems.length > 0) {
            vscode.window.showInformationMessage("🔍 ahmed-x86 Dependencies (macOS):");
            for (const msg of messageItems) {
                await new Promise(resolve => setTimeout(resolve, 300));
                vscode.window.showInformationMessage(msg);

                if (msg === "for install package") {
                    vscode.env.openExternal(vscode.Uri.parse('https://ahmed-x86.github.io/ahmed_x86_asm.html'));
                }
            }
        }
    });
}

// 2. دالة التعرف التلقائي الخاصة بالماك
export function detectMacOption(): { index: number, name: string } {
    return { index: 1, name: "Mac ARM64 Native (main)" };
}

// 3. الدالة الرئيسية لتشغيل الكود على الماك
export async function handleMacBuild(context: vscode.ExtensionContext, editor: vscode.TextEditor) {
    const filePath = editor.document.fileName;
    const fileDir = path.dirname(filePath);
    const fileName = path.basename(filePath);
    const baseName = path.parse(fileName).name;

    const autoDetected = detectMacOption();

    const options = [
        `✨ Auto Detect: ${autoDetected.name}`,
        "1) Mac ARM64 Native (main)"
    ];

    const selection = await vscode.window.showQuickPick(options, {
        placeHolder: `Choose build mode (macOS Apple Silicon)`
    });

    if (!selection) return;

    let selectedIndex = selection.startsWith('✨ Auto Detect') ? autoDetected.index : parseInt(selection.split(')')[0]);

    let commands: string[] = [];

    if (selectedIndex === 1) {
        commands = [
            `as "${fileName}" -o "${baseName}.o"`,
            `ld "${baseName}.o" -o "${baseName}" -lSystem -syslibroot $(xcrun -sdk macosx --show-sdk-path) -e _main`,
            `./"${baseName}"`
        ];
    }

    if (commands.length > 0) {
        const assembleCmd = commands[0];
        const linkCmd = commands.length > 1 ? commands[1] : null;
        const runCommands = commands.length > 2 ? commands.slice(2) : [];

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Window,
            title: "Building Assembly (macOS)...",
        }, async () => {

            let terminal = vscode.window.activeTerminal;
            if (!terminal || terminal.name !== "ahmed_x86_asm") {
                terminal = vscode.window.createTerminal("ahmed_x86_asm");
            }
            terminal.show(true);
            terminal.sendText(`cd "${fileDir}"`);
            terminal.sendText('clear'); 

            const isAssembleSuccess = await assembleAndDiagnose(assembleCmd, fileDir, editor.document);
            terminal.sendText(assembleCmd);

            if (!isAssembleSuccess) return;

            if (linkCmd) {
                const isLinkSuccess = await new Promise<boolean>((resolve) => {
                    cp.exec(linkCmd, { cwd: fileDir }, (error, stdout, stderr) => {
                        if (error) {
                            let errorMsg = (stderr || stdout || error.message).trim();
                            if (errorMsg.length > 300) errorMsg = errorMsg.substring(0, 300) + '...';
                            vscode.window.showErrorMessage(`ahmed-x86 Linker Error: ${errorMsg} ❌`);
                            resolve(false);
                        } else {
                            resolve(true);
                        }
                    });
                });
                terminal.sendText(linkCmd);

                if (!isLinkSuccess) return;
            }

            for (const cmd of runCommands) {
                terminal.sendText(cmd);
            }

            setTimeout(async () => {
                await cleanUpTempFiles(fileDir, baseName);
            }, 1000);
        });
    }
}
