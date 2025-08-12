var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

// The builder.Services is the same ServiceCollection as we did in Lab1
builder.Services.AddRazorPages();

var app = builder.Build();

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

app.Run();

// This line is added to be able to perform tests on the code
// https://docs.microsoft.com/en-us/aspnet/core/test/integration-tests?view=aspnetcore-6.0
public partial class Program { }
