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
            var trackedPage = new TrackedPage
            {
                PageUrl = trackedPageDto.PageUrl,
                Anchors = trackedPageDto.Anchors.Select(a => new Anchor
                {
                    AnchorName = a.AnchorName,
                    TotalTime = a.TotalTime
                    // Note: The TrackedPage reference is automatically set when adding Anchors to TrackedPage
                }).ToList()
            };

            _context.TrackedPages.Add(trackedPage);
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

