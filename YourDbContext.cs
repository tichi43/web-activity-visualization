using Microsoft.EntityFrameworkCore;
using web_activity_visualization.Models;

public class YourDbContext : DbContext
{
    public YourDbContext(DbContextOptions<YourDbContext> options)
        : base(options)
    {
    }

    public DbSet<Url> Urls { get; set; }
    public DbSet<Anchor> Anchors { get; set; }

    // Additional configuration for the model, if needed
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        // Model configuration code here
    }
}
