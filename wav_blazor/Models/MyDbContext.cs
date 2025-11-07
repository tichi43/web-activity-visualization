using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace wav_blazor.Models;


public class MyDbContext : IdentityDbContext<IdentityUser>
{
    public MyDbContext(DbContextOptions<MyDbContext> options)
        : base(options)
    {
    }

    public DbSet<TrackedPage> TrackedPages { get; set; }
    public DbSet<Anchor> Anchors { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<TrackedPage>()
            .HasMany(trackedPage => trackedPage.Anchors)
            .WithOne(anchor => anchor.TrackedPage)
            .HasForeignKey(anchor => anchor.TrackedPageId);
    }

}
