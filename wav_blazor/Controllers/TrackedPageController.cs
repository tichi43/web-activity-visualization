using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using wav_blazor.Models;

namespace wav_blazor.Controllers;


[Route("api/[controller]")]
[ApiController]
public class TrackedPageController : ControllerBase
{
    private readonly MyDbContext _context;

    public TrackedPageController(MyDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> PostTrackedPageData([FromBody] List<TrackedPageDto> trackedPageDtos)
    {
        if (trackedPageDtos == null)
        {
            return BadRequest("Invalid data");
        }

        foreach (var trackedPageDto in trackedPageDtos)
        {
            var existingPage = await _context.TrackedPages
                .Include(tp => tp.Anchors)
                .FirstOrDefaultAsync(tp => tp.PageUrl == trackedPageDto.PageUrl);

            if (existingPage != null)
            {
                // Page exists, update or add anchors
                foreach (var anchorDto in trackedPageDto.AnchorsData)
                {
                    var existingAnchor = existingPage.Anchors
                        .FirstOrDefault(a => a.AnchorName == anchorDto.AnchorName);

                    if (existingAnchor != null)
                    {
                        // Anchor exists, update totalTime
                        existingAnchor.TotalTime += anchorDto.TotalTime;
                    }
                    else
                    {
                        // Anchor does not exist, add new anchor

                        existingPage.Anchors.Add(new Anchor
                        {
                            AnchorName = anchorDto.AnchorName,
                            TotalTime = anchorDto.TotalTime
                        });
                    }


                }
            }
            else
            {
                // Page does not exist, create new
                var newPage = new TrackedPage
                {
                    PageUrl = trackedPageDto.PageUrl,
                    Anchors = trackedPageDto.AnchorsData.Select(a => new Anchor
                    {
                        AnchorName = a.AnchorName,
                        TotalTime = a.TotalTime
                    }).ToList()
                };

                _context.TrackedPages.Add(newPage);
                existingPage = newPage;
            }
            if (trackedPageDto.newVisit)
            {
                existingPage.TotalPageViews++;
            }

            existingPage.LastUpdated = DateTime.Now;

        }

        await _context.SaveChangesAsync();

        return Ok("Data received and saved successfully");
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TrackedPage>>> GetTrackedPages([FromQuery] string? queryPageUrl)
    {
        IQueryable<TrackedPage> query = _context.TrackedPages;

        if (!string.IsNullOrEmpty(queryPageUrl))
        {
            query = query.Where(tp => tp.PageUrl == queryPageUrl);
        }

        var trackedPages = await query
            .Select(tp => new TrackedPage
            {
                TrackedPageId = tp.TrackedPageId,
                PageUrl = tp.PageUrl,
                LastUpdated = tp.LastUpdated,
                TotalViewTime = tp.TotalViewTime,
                TotalPageViews = tp.TotalPageViews,
                IsDataCollectionActive = tp.IsDataCollectionActive,
                IsHeatmapShown = tp.IsHeatmapShown,
                Anchors = tp.Anchors.Select(a => new Anchor
                {
                    AnchorId = a.AnchorId,
                    AnchorName = a.AnchorName,
                    TrackedPageId = a.TrackedPageId,
                    TotalTime = a.TotalTime
                }).ToList()
            })
            .ToListAsync();

        if (trackedPages.Count == 0) // record with given PageUrl not found
        {
            return NotFound();
        }

        return Ok(trackedPages);
    }
}

