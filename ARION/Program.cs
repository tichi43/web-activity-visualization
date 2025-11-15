using ARION.Components;
using ARION.Components.Account;
using ARION.Models;
using Azure.Identity;
using Microsoft.AspNetCore.Components.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;


var builder = WebApplication.CreateBuilder(args);

//enable HTTP/3
builder.WebHost.ConfigureKestrel(options =>
{
    options.ConfigureEndpointDefaults(listenOptions => listenOptions.Protocols = HttpProtocols.Http1AndHttp2AndHttp3);
});

// Razor Components
builder.Services.AddRazorComponents().AddInteractiveServerComponents();

// Controllers
builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Policy1",
        policy =>
        {
            policy.AllowAnyOrigin();
        });
});

// get AAD token and attach to a SqlConnection, then register DbContext with that connection
var token = new DefaultAzureCredential().GetToken(new Azure.Core.TokenRequestContext(new[] { "https://database.windows.net/.default" }));
var sqlConn = new SqlConnection(builder.Configuration.GetConnectionString("AzureProd")) { AccessToken = token.Token };

builder.Services.AddDbContext<MyDbContext>(options =>
        options.UseSqlServer(sqlConn,
            sqlOptions => sqlOptions.EnableRetryOnFailure(
                maxRetryCount: 10,
                maxRetryDelay: TimeSpan.FromSeconds(10),
                errorNumbersToAdd: null
            )
));
builder.Services.AddDatabaseDeveloperPageExceptionFilter();

builder.Services.AddQuickGridEntityFrameworkAdapter();
builder.Services.AddBlazorBootstrap();

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "ARION API",
        Version = "v1",
        Description = "ARION REST API"
    });
});

// Blazor Identity integration
builder.Services.AddCascadingAuthenticationState();
builder.Services.AddScoped<IdentityUserAccessor>();
builder.Services.AddScoped<IdentityRedirectManager>();
builder.Services.AddScoped<AuthenticationStateProvider, IdentityRevalidatingAuthenticationStateProvider>();
builder.Services.AddSingleton<IEmailSender<IdentityUser>, IdentityNoOpEmailSender>();

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

var app = builder.Build();

// 1. Error handling & Swagger
app.UseSwagger();
if (app.Environment.IsDevelopment())
{
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
app.UseCors();

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

