import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// 1. دالة لتنفيذ أوامر الطرفية وجلب السطر الأول (تُستخدم في فحص الحزم)
export async function runCmd(cmd: string): Promise<{ success: boolean, output: string }> {
    return new Promise((resolve) => {
        cp.exec(cmd, (error, stdout, stderr) => {
            const output = (stdout || stderr || '').trim();
            if (error && !stdout) {
                resolve({ success: false, output: '' });
            } else {
                // تنظيف المخرجات من أي أحرف غريبة قد تسبب مشاكل في العرض
                const firstLine = output.split('\n')[0].trim().replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
                resolve({ success: true, output: firstLine });
            }
        });
    });
}

// 2. دالة مساعدة للحصول على مسار مكتبة Irvine وحفظه (تُستخدم في ويندوز ولينكس للـ Wine)
export async function getIrvinePath(context: vscode.ExtensionContext): Promise<string | undefined> {
    let irvinePath = context.globalState.get<string>('irvineLibPath');

    if (!irvinePath) {
        const uri = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Irvine Library Folder',
            title: 'Please select the folder containing Irvine32.lib'
        });

        if (uri && uri[0]) {
            irvinePath = uri[0].fsPath;
            await context.globalState.update('irvineLibPath', irvinePath);
            vscode.window.showInformationMessage(`Irvine library path saved successfully: ${irvinePath}`);
        } else {
            vscode.window.showErrorMessage('Irvine library path is required to use this build option! 😅');
            return undefined;
        }
    }
    return irvinePath;
}

// 3. دالة لتنظيف الملفات المؤقتة بعد التجميع
export async function cleanUpTempFiles(fileDir: string, baseName: string) {
    // قراءة الإعدادات الخاصة بالإضافة
    const config = vscode.workspace.getConfiguration('ahmed-x86-asm.cleanup');
    const isEnabled = config.get<boolean>('enabled', false);
    const extensionsToClean = config.get<string[]>('extensions', ['.obj', '.o', '.err', '.lst']);

    // إذا كانت الميزة معطلة، اخرج من الدالة
    if (!isEnabled) return;

    // المرور على الامتدادات ومحاولة حذف الملفات إن وجدت
    for (const ext of extensionsToClean) {
        const targetFile = path.join(fileDir, `${baseName}${ext}`);
        if (fs.existsSync(targetFile)) {
            try {
                fs.unlinkSync(targetFile);
            } catch (err) {
                console.error(`ahmed-x86 ASM: Could not delete ${targetFile}`, err);
            }
        }
    }
}
