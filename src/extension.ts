import * as vscode from 'vscode';
import * as os from 'os';

// 1. استيراد الأنظمة (Platforms)
import { checkLinuxDeps, handleLinuxBuild } from './platforms/linux';
import { checkWindowsDeps, handleWindowsBuild } from './platforms/windows';
import { checkMacDeps, handleMacBuild } from './platforms/darwin';

// 2. استيراد دوال الأدوات و الأخطاء
import { setupDiagnostics } from './diagnostics';
import { registerOSSpecificSnippets } from './utils'; // <--- السطر الجديد

export function activate(context: vscode.ExtensionContext) {
    const currentPlatform = os.platform();

    // 🌟 تفعيل المقتطفات (Snippets) الذكية بناءً على نظام التشغيل الحالي
    registerOSSpecificSnippets(context, currentPlatform);

    // 🌟 تهيئة نظام اكتشاف الأخطاء ورسم الدوائر الحمراء
    setupDiagnostics(context);

    // 🌟 فحص الاعتماديات (Dependencies) عند أول تشغيل للإضافة
    const hasCheckedDeps = context.globalState.get<boolean>('hasCheckedDeps_v108');
    if (!hasCheckedDeps) {
        if (currentPlatform === 'linux') {
            checkLinuxDeps();
        } else if (currentPlatform === 'win32') {
            checkWindowsDeps();
        } else if (currentPlatform === 'darwin') {
            checkMacDeps();
        }
        context.globalState.update('hasCheckedDeps_v108', true); // حفظ الحالة
    }

    // ==========================================
    // تسجيل الأوامر (Commands Registration)
    // ==========================================

    // أمر فحص الحزم اليدوي
    let checkDepsDisposable = vscode.commands.registerCommand('ahmed-x86-asm.checkDeps', () => {
        if (currentPlatform === 'linux') checkLinuxDeps();
        else if (currentPlatform === 'win32') checkWindowsDeps();
        else if (currentPlatform === 'darwin') checkMacDeps();
        else vscode.window.showErrorMessage('This platform is not supported for dependency checks.');
    });

    // أمر إعادة تعيين مسار مكتبة Irvine
    let resetPathDisposable = vscode.commands.registerCommand('ahmed-x86-asm.resetIrvinePath', async () => {
        await context.globalState.update('irvineLibPath', undefined);
        vscode.window.showInformationMessage('Irvine library path has been reset. You will be prompted to select it again next time.');
    });

    // ------------------------------------------
    // أوامر التحكم في الـ Linker للويندوز
    // ------------------------------------------
    let resetLinkerDisposable = vscode.commands.registerCommand('ahmed-x86-asm.resetLinkerMethod', async () => {
        await context.globalState.update('win32LinkerMethod', undefined);
        vscode.window.showInformationMessage('Win32 Linker method has been reset. The extension will test again next run.');
    });

    let setLinkerDisposable = vscode.commands.registerCommand('ahmed-x86-asm.setLinkerMethod', async () => {
        const currentMethod = context.globalState.get<string>('win32LinkerMethod') || 'Auto (Not set)';
        const options = [
            { label: 'ld', description: 'Use GNU Linker (ld.exe)' },
            { label: 'gcc', description: 'Use GCC as Linker (gcc.exe)' }
        ];

        const selection = await vscode.window.showQuickPick(options, {
            placeHolder: `Select Win32 Linker Method | Current: ${currentMethod}`
        });

        if (selection) {
            await context.globalState.update('win32LinkerMethod', selection.label);
            vscode.window.showInformationMessage(`Win32 Linker method successfully set to: ${selection.label.toUpperCase()} ✅`);
        }
    });

    // ------------------------------------------
    // أوامر التحكم في الـ Linker للينكس
    // ------------------------------------------
    let resetLinuxLinkerDisposable = vscode.commands.registerCommand('ahmed-x86-asm.resetLinuxLinkerMethod', async () => {
        await context.globalState.update('linuxLinkerMethod', undefined);
        vscode.window.showInformationMessage('Linux Linker method has been reset to default (ld).');
    });

    let setLinuxLinkerDisposable = vscode.commands.registerCommand('ahmed-x86-asm.setLinuxLinkerMethod', async () => {
        const currentMethod = context.globalState.get<string>('linuxLinkerMethod') || 'ld';
        const options = [
            { label: 'ld', description: 'Use GNU Linker (Standard, best for pure ASM)' },
            { label: 'gcc', description: 'Use GCC (Best for C-Library integration)' }
        ];

        const selection = await vscode.window.showQuickPick(options, {
            placeHolder: `Select Linux Linker Method | Current: ${currentMethod}`
        });

        if (selection) {
            await context.globalState.update('linuxLinkerMethod', selection.label);
            vscode.window.showInformationMessage(`Linux Linker method successfully set to: ${selection.label.toUpperCase()} ✅`);
        }
    });

    // ------------------------------------------
    // أمر التحكم في عرض سجلات Wine
    // ------------------------------------------
    let toggleWineLogDisposable = vscode.commands.registerCommand('ahmed-x86-asm.toggleWineLog', async () => {
        const isWineLogEnabled = context.globalState.get<boolean>('wineLogEnabled') === true;
        const options = [
            { label: 'OFF', description: 'Hide Wine warnings and errors (Clean output, Recommended)' },
            { label: 'ON', description: 'Show all Wine logs (Useful for deep debugging)' }
        ];

        const selection = await vscode.window.showQuickPick(options, {
            placeHolder: `Set Wine Log Visibility | Current: ${isWineLogEnabled ? 'ON' : 'OFF'}`
        });

        if (selection) {
            const newState = selection.label === 'ON';
            await context.globalState.update('wineLogEnabled', newState);
            vscode.window.showInformationMessage(`Wine Log is now set to: ${selection.label} 🍷`);
        }
    });

    // ==========================================
    // 🚀 أمر التشغيل الرئيسي (The Router)
    // ==========================================
    let runDisposable = vscode.commands.registerCommand('ahmed-x86-asm.run', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Oops, looks like no file is open! 😅');
            return;
        }

        // توجيه المهمة للملف الخاص بالنظام
        if (currentPlatform === 'linux') {
            await handleLinuxBuild(context, editor);
        } else if (currentPlatform === 'win32') {
            await handleWindowsBuild(context, editor);
        } else if (currentPlatform === 'darwin') {
            await handleMacBuild(context, editor);
        } else {
            vscode.window.showErrorMessage('This system is not supported yet! 😅');
        }
    });

    // ==========================================
    // قائمة الإعدادات السريعة (Settings Menu)
    // ==========================================
    let showSettingsMenuDisposable = vscode.commands.registerCommand('ahmed-x86-asm.showSettingsMenu', async () => {
        const options = [
            { label: '$(settings-gear) Open Extension Settings', description: 'Configure extension features (e.g., auto-cleanup)', command: 'settings' },
            { label: '$(package) Check Dependencies', description: 'Verify required ASM tools and packages', command: 'ahmed-x86-asm.checkDeps' },
            { label: '$(folder-opened) Reset Irvine Path', description: 'Clear the saved Irvine32 directory path', command: 'ahmed-x86-asm.resetIrvinePath' },
            { label: '$(output) Toggle Wine Log', description: 'Show or hide Wine terminal warnings', command: 'ahmed-x86-asm.toggleWineLog' },
            { label: '$(wrench) Set Win32 Linker Method', description: 'Choose between ld or gcc for Windows linking', command: 'ahmed-x86-asm.setLinkerMethod' },
            { label: '$(refresh) Reset Win32 Linker Method', description: 'Let the extension auto-detect the Windows linker', command: 'ahmed-x86-asm.resetLinkerMethod' },
            { label: '$(wrench) Set Linux Linker Method', description: 'Choose between ld or gcc for Linux linking', command: 'ahmed-x86-asm.setLinuxLinkerMethod' },
            { label: '$(refresh) Reset Linux Linker Method', description: 'Restore the default Linux linker (ld)', command: 'ahmed-x86-asm.resetLinuxLinkerMethod' }
        ];

        const selection = await vscode.window.showQuickPick(options, {
            placeHolder: 'ahmed-x86 ASM: Tools & Settings ⚙️'
        });

        if (selection) {
            if (selection.command === 'settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'ahmed-x86-asm');
            } else {
                vscode.commands.executeCommand(selection.command);
            }
        }
    });

    // إضافة جميع الأوامر إلى الـ Subscriptions لكي يقوم VS Code بإدارتها
    context.subscriptions.push(
        checkDepsDisposable,
        resetPathDisposable,
        resetLinkerDisposable,
        setLinkerDisposable,
        resetLinuxLinkerDisposable,
        setLinuxLinkerDisposable,
        toggleWineLogDisposable,
        runDisposable,
        showSettingsMenuDisposable
    );
}

export function deactivate() {}
