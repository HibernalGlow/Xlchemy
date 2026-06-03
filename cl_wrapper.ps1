# Wrapper for cl.exe that filters out GCC-style arguments
$args = $args | Where-Object { $_ -ne "-Werror" -and $_ -ne "-Wall" -and $_ -ne "-g" }
& "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\14.44.35207\bin\Hostx64\x64\cl.exe" @args