using Azure.Identity;
using Microsoft.AspNetCore.Components.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using wav_blazor.Components;
using wav_blazor.Components.Account;
using wav_blazor.Models;


var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel
builder.WebHost.ConfigureKestrel((context, options) =>
{
    options.ListenAnyIP(5011, listenOptions =>
    {
        listenOptions.Protocols = HttpProtocols.Http1AndHttp2AndHttp3;
        listenOptions.UseHttps();
    });
});

// Razor Components
builder.Services.AddRazorComponents().AddInteractiveServerComponents();

// Controllers
builder.Services.AddControllers();

if (builder.Environment.IsDevelopment())
{
    // DbContext development
    builder.Services.AddDbContext<MyDbContext>(options =>
           options.UseSqlServer(builder.Configuration.GetConnectionString("MyDatabase") + "Password=" + builder.Configuration["ConnectionStrings:DBPASS"],
                sqlOptions => sqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 10, // More retries
                    maxRetryDelay: TimeSpan.FromSeconds(7),
                    errorNumbersToAdd: null
                )
    ));
    builder.Services.AddDatabaseDeveloperPageExceptionFilter();
}
else
{
    //production DBcontext
    var connection = new SqlConnection(builder.Configuration.GetConnectionString("AzureProd"));
    var credential = new DefaultAzureCredential();
    var token = await credential.GetTokenAsync(new Azure.Core.TokenRequestContext(new[] { "https://database.windows.net/" }));
    connection.AccessToken = token.Token;

    builder.Services.AddDbContext<MyDbContext>(options =>
           options.UseSqlServer(connection,
                sqlOptions => sqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 10, // More retries
                    maxRetryDelay: TimeSpan.FromSeconds(7),
                    errorNumbersToAdd: null
                )
    ));
    builder.Services.AddDatabaseDeveloperPageExceptionFilter();
}
// UI and EF helpers
builder.Services.AddQuickGridEntityFrameworkAdapter();
builder.Services.AddBlazorBootstrap();

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Blazor Identity integration
builder.Services.AddCascadingAuthenticationState();
builder.Services.AddScoped<IdentityUserAccessor>();
builder.Services.AddScoped<IdentityRedirectManager>();
builder.Services.AddScoped<AuthenticationStateProvider, IdentityRevalidatingAuthenticationStateProvider>();

// Authentication
builder.Services.AddAuthentication(options =>
    {
        options.DefaultScheme = IdentityConstants.ApplicationScheme;
        options.DefaultSignInScheme = IdentityConstants.ExternalScheme;
    })
    .AddIdentityCookies();

// Identity setup
builder.Services.AddIdentityCore<IdentityUser>(options =>
    {
        options.SignIn.RequireConfirmedAccount = true;
        options.Password.RequireDigit = false;
        options.Password.RequiredLength = 3;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireLowercase = false;
    })
    .AddEntityFrameworkStores<MyDbContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();

// Identity helper
builder.Services.AddSingleton<IEmailSender<IdentityUser>, IdentityNoOpEmailSender>();

var app = builder.Build();

// 1. Error handling & Swagger
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
}

// 2. HTTPS & static files early
app.UseHttpsRedirection();
app.UseDefaultFiles();
app.UseStaticFiles();

// 3. Routing before Auth
app.UseRouting();

// 4. Authentication & Authorization
app.UseAuthentication();
app.UseAuthorization();

// 5. Anti-Forgery (after Auth, before endpoints)
app.UseAntiforgery();

// 6. Map endpoints
app.MapAdditionalIdentityEndpoints();
app.MapRazorComponents<App>().AddInteractiveServerRenderMode();
app.MapControllers();

// 7. Run application
app.Run();

