# Folder structure

```
│   FolderStructure.md  // You are here
│   Git.md              // How to install git
│   Lab1.sln            // Described below
│   README.md           // The main readme file for the Lab
│
├───.vscode             // Hidden folder for VSCode related files
│       launch.json     // Configurations for starting and debugging the project
│       tasks.json      // Configurations for build, publish, watch of the project
│
├───UiS.Dat240.Lab1             // The main project folder
│   │   Program.cs              // Described below
│   │   TestSubmissions.cs      // File containing entry points for delivering final implementations
│   │   UiS.Dat240.Lab1.csproj  // CSharp project file for the main project
│   │
│   └───Queues                  // Folder containing the queue interfaces which should be implemented
│           IGenericQueue.cs    // The generic queue interface file
│           IObjectQueue.cs     // The object queue interface file
│           IStringQueue.cs     // The string queue interface file
│
└───UiS.Dat240.Lab1.Tests               // The main test project folder
        UiS.Dat240.Lab1.Tests.csproj    // CSharp project file
        QueueTests.cs                   // CSharp file containing tests
```

## Lab1.sln

This is a Visual Studio solutions file, which contains references to the Lab project [UiS.Dat240.Lab1](./UiS.Dat240.Lab1/UiS.Dat240.Lab1.csproj) and the test project [UiS.Dat240.Lab1.Tests](./UiS.Dat240.Lab1.Tests/UiS.Dat240.Lab1.Tests.csproj) for Lab1. We use this file to tell OmniSharp to run code analysis and completion om both projects.

Check if Lab1.sln is the selected project for OmniSharp. This can be checked on the tool bar at the bottom of VSCode. On the right side of the fire icon (OmniSharp server status) it should stand Lab1.sln. If the Lab1.sln is not select then open the command pallet with pressing `CTRL + SHIFT + P` (windows/linux), `CMD + SHIFT + P` (mac) or `F1`. Then type `OmniSharp: Select Project` and hit enter. Select the Lab1.sln file.

The sln file can also be opened in Visual Studio directly. 

## .csproj files

The .csproj file extensions is used for CSharp Project files. These files contains which dotnet and C# version to use, as well as references and packages which the code require to run. A lot more information can be stored in the csproj file, but that is not important for this lab.

## Program.cs

Program.cs is usually the file containing the Main function of a C# project. This is usually a nice starting point for looking through the code.
