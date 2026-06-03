@echo off
setlocal
set args=
for %%a in (%*) do (
    if not "%%a"=="-Werror" (
        if not "%%a"=="-Wall" (
            set args=!args! %%a
        )
    )
)
cl.exe !args!