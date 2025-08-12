# Lab 2 Web Project

* Deadline: 26.09.2024
* The lab has to be manually approved by the teaching assistants during lab hour.
  * The student is expected to explain the code during the manually approval.
  * All code has to be submitted before the deadline, but can be approved on the first lab after the deadline.
  * It is possible to get the code approved before the deadline.

## Downloading the updated assignments repo

To update your local lab folder to the updated assignments repo then make sure of the following:

1. Run `git remote -v` while standing in your labs folder.
2. Here you should see that the two origin is pointing to your labs at GitHub
3. There should also be two that is named something like `course-assignments`, `assignments` or `labs` which points to `https://github.com/dat240-2025/assignments` or `git@github.com:dat240-2025/assignments.git` depending on if you used HTTPS or SSH when setting up the repo.
   1. If this other remote is missing then please investigate how to set it up here: `https://github.com/dat240-2025/info/blob/main/lab-submission.md`, but it should be as simple as running `git remote add course-assignments https://github.com/dat240-2025/assignments` for the https variant
4. pull the changes from the other remote with this command `git pull {other-remote-name} main`, and replace `{other-remote-name}` with the name of the other remote which is not named origin you had in `git remote -v`.

## An asp.net core ordering system

### The project

The second lab is building an asp.net core ordering application. The basic skeleton for the code is already created with the command `dotnet new razor`. If you want, you can try this for yourself in another directory. 

To see the starter template, navigate to the UiS.Dat240.Lab2 directory in a command line and run the command: `dotnet run`. The web page should now start on address [https://localhost:5001](https://localhost:5001). 

#### Warning in Firefox or other browsers

You might see a warning like `Warning: Potential Security Risk Ahead`, which complains about the SSL certificate is not signed by a trusted certificate authority (self-signed). If this appear it is safe to click `Accept the Risk and Continue` for this page. This is only safe to do for page you trust are okay to visit, which is in this case our own web page. If the warning appears on any other page, please be careful about what you do.

### How to start the lab:

Please read the following page for how to work with [ASP.NET Core Razor page](https://docs.microsoft.com/en-us/aspnet/core/razor-pages/). In the example using CustomerDbContext database then use the `ShopContext` as well as `FoodItem` instead of `CustomerDbContext` and `Customer`. It can also be useful to read more about asp.net core at the following links.

* [Asp.net core Fundamentals](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/)
* [Dependency Injection](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection)

There is also a note later in the lab about .NET 6 and older versions of .NET, since they changed the default template. If you look on some old csharp asp.net core examples then please make sure to read the note first!

## Building a food ordering system

For this lab there will be no restrictions on the use of the framework like there was in lab one. Lab one was simply to teach some concepts of C# without relying too much on the framework itself. In this lab we will build an ordering system which can add, edit and display food ordering items. Under is some of the requirements for how the system should work:

1. The main/index page should be an overview of all the food items sold.
   1. The overview should contain:
      1. The title for each item
      2. The description for each item
      3. How long the item takes to make
      4. The price for the item
2. An administrator page which should have the following functionality
   1. The first thing on the admin page should be a table with all items
   2. The table should contain the id, title, time to make, price and an edit button for each item
   3. A button to add a new item
      1. The add button page should contain a form to fill in the values for a food item except the id
         1. The id should be auto incremented by the database, so it is unique.
   4. The edit page should take the user to a page which looks the same as the add page
      1. All the field should be filled out with the values for the food item being edited
   5. Both the add and edit page should contain validation for adding/editing the food item
      1. If the validation fails then the item should not be created/updated
      2. If there are any validation errors when creating/updating the item then it should be display on the page.

### Database

For lab2 you are going to use the SQLite database engine together with Entity Framework Core (EF Core). The class ShopContext is the class that is going to be used together with EF Core DbContext. After it is derived from DbContext as well as containing a DbSet as described in the link about, then you can use [Code first migrations](https://docs.microsoft.com/en-us/ef/core/managing-schemas/migrations/?tabs=dotnet-core-cli) to create the migration and the database file. For the migration you will need to install the dotnet-ef command line tool as described in the link. Here is a good link for how to [create the DBContext class with dependency injection in asp.net](https://docs.microsoft.com/en-us/ef/core/dbcontext-configuration/). And how to create the [connection string for the SQLite server can be found at the bottom of the page](https://docs.microsoft.com/en-us/dotnet/standard/data/sqlite/connection-strings). 

In the examples it is written how to use the in memory database instead of sqlite, but this should be quite similar with just having to write `UseSqlite` instead.

For the database to work in the web application you must install the following to NuGet packages:

* [Microsoft.EntityFrameworkCore.Design](https://www.nuget.org/packages/Microsoft.EntityFrameworkCore.Design/)
* [Microsoft.EntityFrameworkCore.Sqlite](https://www.nuget.org/packages/Microsoft.EntityFrameworkCore.Sqlite/)

Installation instructions can be found on the links about. After the NuGet packages has been added you might need to run `dotnet restore` to download the dependencies.

### Using other external libraries

If you choose to use any other external library which is not included in the list above then you need to justify why the extra library is needed. It is not necessary to include any other external library for lab2. 

External libraries have a tendency to add complexity as well as greater security risk to the application, since it is code that we ourself is not in control of.

### Validation

The following validation rules should apply for the add end edit page
* Both name and description should contain a value which is not only whitespaces
* The price must be greater than 0

The `IFoodItemValidator.IsValid` function should return an array of all the error messages found. If only name is empty then it should return an array with only one index containing an error message. If name and description is missing a value, then it should return to strings in the array. The best way to do this is creating a C# `List<string>` and add one value for each error. Then use the `List<string>.ToArray()` to get an array from the list.

#### Validation tests

Validation is one of the things that is easy to write validation for, since it does not depend on any external dependencies. So then as part of lab one then you are going to at least write some tests for the validation. 
The tests should test all the different scenarios which is possible in the validation, both the once that should success and the once that fails. To do this look at the skeleton code in the test project and write tests for the scenarios. The test will fail until you have registered an IFoodItemValidator to the DI container.

The different scenarios should be separate tests, since else it is hard to know which rules passes and which does not. In XUnit there are two ways to write tests. The first one is to copy the method, including the `[Fact]` attribute multiple times and change the method name and code for each copy to test the different scenarios. The second method is to use XUnit's [theory](https://xunit.net/docs/getting-started/netfx/visual-studio#write-first-theory) which allows to create a method which takes in input data based on InlineData attributes. You are free to choose one or both of the methods to write the tests.

### DependencyInjection (DI and DI Container)

The QuickFeed tests for this lab are based on what is registered in the dependency injection container. In the program file, the `builder.Services...` calls are responsible for doing dependency injection, and it is possible to read more about dependency injection [here.](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection). This is the same dependency injection container we used in Lab1.

The tests expects that the following is registered and working properly

* ShopContext which should inherit from an EF Core DbContext
* IFoodItemValidator which should validate a food item in accordance with the rules described under validation
* IFoodItemProvider which should support the standard [CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete) operations

### Note about .NET 6 and older versions

In older version of .NET the primary asp.net core setup code was split between the following two files:

> Program.cs
```csharp
   public class Program
   {
      public static void Main(string[] args)
      {
         CreateHostBuilder(args).Build().Run();
      }

      public static IHostBuilder CreateHostBuilder(string[] args) =>
         Host.CreateDefaultBuilder(args)
               .ConfigureWebHostDefaults(webBuilder =>
               {
                  webBuilder.UseStartup<Startup>();
               });
   }
```

> Startup.cs
```csharp
public class Startup
   {
      public Startup(IConfiguration configuration)
      {
         Configuration = configuration;
      }

      public IConfiguration Configuration { get; }

      // This method gets called by the runtime. Use this method to add services to the container.
      public void ConfigureServices(IServiceCollection services)
      {
         services.AddRazorPages();
      }

      // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
      public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
      {
         if (env.IsDevelopment())
         {
               app.UseDeveloperExceptionPage();
         }
         else
         {
               app.UseExceptionHandler("/Error");
               // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
               app.UseHsts();
         }

         app.UseHttpsRedirection();
         app.UseStaticFiles();

         app.UseRouting();

         app.UseAuthorization();

         app.UseEndpoints(endpoints =>
         {
               endpoints.MapRazorPages();
         });
      }
   }
```

This maps to the current format in this way:


```csharp
var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

//// This is the ConfigureServices function from Startup.cs. Instead of using 
//// `IServiceCollection services` directly we access it from builder.Services. 
//// `builder.Services` is an IServiceCollection, the same we used in lab1
builder.Services.AddRazorPages();

//// This is the end of ConfigureServices and the builder.Build() from the program.cs comes after

var app = builder.Build();

//// This is the part of the Configure method from the Startup.cs file

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();

app.MapRazorPages();

//// This is the end of the configure method and the Run part from the program.cs file comes after

app.Run();
```

### Async Await

The methods defined in the `IFoodItemProvider` interface expects the code to be async. This is a concept which can be [read more about here](https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/concepts/async/). This has some consequences for code that will usually run synchronously and means we must wrap the code in `Task.FromResult` or return `Task.CompletedTask` to support this. When using EF Core there should be a synchronous and an asynchronous method for completing database operations, and here the asynchronous way should always be used with await before. 
Only in very rare situations should a task be waited directly instead of awaiting with the `await` keyword. Also the `Task.Wait` should not be used for these scenarios but instead `Task.GetAwaiter().GetResult()`, and the reason for this is that `GetAwaiter().GetResult()` produces a prettier stack trace with exceptions. The reason for not running a task synchronous is that it blocks the running thread, and C# only creates sparingly new threads, since there is some overhead with having too many threads. This means that if enough `Wait()` operations are in progress then all the threads could be used up before the thread pool is grown. It is possible to [read about this in depth here](https://docs.microsoft.com/nb-no/archive/blogs/vancem/diagnosing-net-core-threadpool-starvation-with-perfview-why-my-service-is-not-saturating-all-cores-or-seems-to-stall?WT.mc_id=DT-MVP-5003325).

## Approval script

We will require you to do the following steps under the manual approval

1. Start web page
   1. The web page should run at https://
2. Navigate to the admin overview of all FoodItems
3. Add new food item 
   * Name: "UiS Pizza"
   * Description: "Amazing pizza"
   * Price: 159.69
   * CreationTime: 10
4. Add new food item
   * Let every field be blank and create the item
   * There should be validation errors
   * Use the title from the list bellow and create it again
   * There should now be fewer errors
5. Add the complete new food item 
   * Name: "AA Pizza"
   * Description: "Another Amazing pizza"
   * Price: 189.69
   * CreationTime: 15
6. Edit AA Pizza
   *  Name: B Pizza
   *  Description: Boring Pizza
   *  Price: 119
7. Show the customer overview of all the pizza
8. Show and explain the implementations of the interfaces
9. Show validation
10. Show Startup and DI
11. Show the unit tests
