using Amazon.Runtime.Internal.Endpoints.StandardLibrary;
using Microsoft.EntityFrameworkCore;

namespace web_activity_visualization.Models;


public class MyDbContext : DbContext
{
    public MyDbContext(DbContextOptions<MyDbContext> options)
        : base(options)
    {
    }

    public DbSet<TrackedPage> TrackedPages { get; set; }
    public DbSet<Anchor> Anchors { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TrackedPage>()
            .HasMany(trackedPage => trackedPage.Anchors)
            .WithOne(anchor => anchor.TrackedPage)
            .HasForeignKey(anchor => anchor.TrackedPageId);
    }

}
