//using System.ComponentModel.DataAnnotations;

namespace ARION.Models;

public class TrackedPage
{
    public int TrackedPageId { get; set; }
    public required string PageUrl { get; set; }
    public DateTime LastUpdated { get; set; } = DateTime.Now;
    public int TotalViewTime { get; set; } = 0;
    public int TotalPageViews { get; set; } = 0;
    public bool IsDataCollectionActive { get; set; } = true;
    public bool IsHeatmapShown { get; set; } = true;
    public List<Anchor> Anchors { get; set; } = new List<Anchor>();
}

public class Anchor
{
    public int AnchorId { get; set; }
    public int TrackedPageId { get; set; }
    public required string AnchorName { get; set; }
    public int TotalTime { get; set; }

    public TrackedPage? TrackedPage { get; set; }
}

public class TrackedPageDto
{
    public required string PageUrl { get; set; }
    public required List<AnchorDto> AnchorsData { get; set; }
    public bool newVisit { get; set; }
}

public class AnchorDto
{
    public required string AnchorName { get; set; }
    public int TotalTime { get; set; }
}


