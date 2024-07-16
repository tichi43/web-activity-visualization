using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using web_activity_visualization.Models;

namespace web_activity_visualization.Controllers;


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
                foreach (var anchorDto in trackedPageDto.Anchors)
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
                        // Anchor does not exist, add new anchor (SHOULD NEVER RUN!)
                        /*existingPage.Anchors.Add(new Anchor
                        {
                            AnchorName = anchorDto.AnchorName,
                            TotalTime = anchorDto.TotalTime
                        });*/
                        return BadRequest("New anchor found on existing page, please delete the page from the database if it was edited.");
                    }
                }
            }
            else
            {
                // Page does not exist, create new
                var newPage = new TrackedPage
                {
                    PageUrl = trackedPageDto.PageUrl,
                    Anchors = trackedPageDto.Anchors.Select(a => new Anchor
                    {
                        AnchorName = a.AnchorName,
                        TotalTime = a.TotalTime
                    }).ToList()
                };

                _context.TrackedPages.Add(newPage);
            }
        }

        await _context.SaveChangesAsync();

        return Ok("Data received and saved successfully");
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TrackedPage>>> GetAllTrackedPages()
    {
        var trackedPages = await _context.TrackedPages
            .Select(tp => new TrackedPage
            {
                TrackedPageId = tp.TrackedPageId,
                PageUrl = tp.PageUrl,
                Anchors = tp.Anchors.Select(a => new Anchor
                {
                    AnchorId = a.AnchorId,
                    AnchorName = a.AnchorName,
                    TrackedPageId = a.TrackedPageId,
                    TotalTime = a.TotalTime

                }).ToList()
            })
            .ToListAsync();

        return Ok(trackedPages);
    }
}

