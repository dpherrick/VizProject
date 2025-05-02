document.addEventListener('DOMContentLoaded', () => {
  const width=800, height=500, margin={top:50,right:100,bottom:50,left:80};
  const tooltip=d3.select('#tooltip');
  d3.csv('data/netflix_data.csv',d=>({
    title:d.title, country:d.country, type:d.type, rating:d.rating,
    year:+d.release_year, seasons:+d.seasons, genre:d.genre
  })).then(data => { drawBar(data); drawPies(data); });

  function drawBar(data){
    const filtered=data.filter(d=>d.country);
    const roll=d3.rollup(filtered,v=>({
      Movie:v.filter(d=>d.type==='Movie').length,
      'TV Show':v.filter(d=>d.type==='TV Show').length, total:v.length
    }),d=>d.country);
    let arr=Array.from(roll,([country,c])=>({country,...c}));
    arr.sort((a,b)=>b.total-a.total).slice(0,10);
    arr=arr.slice(0,10);
    const keys=['Movie','TV Show'], stack=d3.stack().keys(keys)(arr);
    const svg=d3.select('#chart1').append('svg').attr('width',width).attr('height',height);
    const x=d3.scaleBand().domain(arr.map(d=>d.country)).range([margin.left,width-margin.right]).padding(0.1);
    const y=d3.scaleLinear().domain([0,d3.max(arr,d=>d.total)]).nice().range([height-margin.bottom,margin.top]);
    const color=d3.scaleOrdinal().domain(keys).range(['#1f77b4','#ff7f0e']);
    svg.selectAll('g.layer').data(stack).join('g').attr('fill',d=>color(d.key))
      .selectAll('rect').data(d=>d).join('rect')
      .attr('x',d=>x(d.data.country)).attr('y',d=>y(d[1]))
      .attr('height',d=>y(d[0])-y(d[1])).attr('width',x.bandwidth())
      .on('mouseover',(e,d)=>{const key=e.target.parentNode.__data__.key;tooltip.style('opacity',0.9).html(key+': '+d.data[key]).style('left',(e.pageX+5)+'px').style('top',(e.pageY-28)+'px');})
      .on('mouseout',()=>tooltip.style('opacity',0));
          // total labels
          svg.selectAll('text.total').data(arr).join('text')
            .attr('class', 'total')
            .attr('x', d => x(d.country) + x.bandwidth()/2)
            .attr('y', d => y(d.total) - 5)
            .attr('text-anchor', 'middle')
            .text(d => d.total);
    svg.append('g').attr('transform',`translate(0,${height-margin.bottom})`).call(d3.axisBottom(x)).selectAll('text').attr('transform','rotate(-40)').style('text-anchor','end');
    svg.append('g').attr('transform',`translate(${margin.left},0)`).call(d3.axisLeft(y));
  }

  function drawPies(data){
    const mapping={ 'TV-MA':'red','R':'orange','TV-14':'yellow','TV-PG':'green','TV-Y7':'lightgreen' };
    // Movies
    const movies=data.filter(d=>d.type==='Movie');
    let mc=Array.from(d3.rollup(movies,v=>v.length,d=>d.rating),([rating,count])=>({rating,count}));
    mc.sort((a,b)=>b.count-a.count); mc=mc.slice(0,4);
    drawPie('#pie-movie',mc,'Movie Ratings',mapping);
    // TV Shows
    const tvs=data.filter(d=>d.type==='TV Show');
    let tc=Array.from(d3.rollup(tvs,v=>v.length,d=>d.rating),([rating,count])=>({rating,count}));
    tc.sort((a,b)=>b.count-a.count); tc=tc.slice(0,4);
    drawPie('#pie-tv',tc,'TV Ratings',mapping);
  }

  function drawPie(sel,data,title,mapping){
    const r=100;
    const svg=d3.select(sel).append('svg').attr('width',r*2+margin.left+margin.right).attr('height',r*2+margin.top+margin.bottom)
      .append('g').attr('transform',`translate(${r+margin.left/2},${r+margin.top/2})`);
    const pie=d3.pie().value(d=>d.count), arc=d3.arc().innerRadius(0).outerRadius(r);
    svg.append('text').attr('x',0).attr('y',-r-10).attr('text-anchor','middle').text(title);
    const arcs=svg.selectAll('arc').data(pie(data)).join('g');
    arcs.append('path').attr('d',arc).attr('fill',d=>mapping[d.data.rating]||d3.schemeCategory10[0])
      .on('mouseover',(e,d)=>{tooltip.style('opacity',0.9).html(d.data.rating+': '+d.data.count).style('left',(e.pageX+5)+'px').style('top',(e.pageY-28)+'px');})
      .on('mouseout',()=>tooltip.style('opacity',0));
    arcs.append('text').attr('transform',d=>`translate(${arc.centroid(d)})`).attr('text-anchor','middle').text(d=>d.data.rating);
  }

  function drawLine(data){
    const tvs=data.filter(d=>d.type==='TV Show');
    // top 12 genres
    const genreCount=d3.rollup(tvs,v=>v.length,d=>d.genre);
    const genres=Array.from(genreCount,([g,c])=>({g,c})).sort((a,b)=>b.c-a.c).slice(0,12).map(d=>d.g);
    const years=Array.from(new Set(tvs.map(d=>d.year))).sort();
    const lineData=genres.map(g=>({
      genre:g, values:years.map(y=>({year:y, count:tvs.filter(d=>d.genre===g&&d.year===y).length}))
    }));
    const svg=d3.select('#chart3').append('svg').attr('width',width).attr('height',height);
    const x=d3.scaleLinear().domain(d3.extent(years)).range([margin.left,width-margin.right]);
    const y=d3.scaleLinear().domain([0,d3.max(lineData,c=>d3.max(c.values,d=>d.count))]).nice().range([height-margin.bottom,margin.top]);
    const color=d3.scaleOrdinal(d3.schemeCategory10).domain(genres);
    svg.append('g').attr('transform',`translate(0,${height-margin.bottom})`).call(d3.axisBottom(x).tickFormat(d3.format('d')));
    svg.append('g').attr('transform',`translate(${margin.left},0)`).call(d3.axisLeft(y));
    const line=d3.line().x(d=>x(d.year)).y(d=>y(d.count));
    svg.selectAll('path').data(lineData).join('path')
      .attr('fill','none').attr('stroke',d=>color(d.genre)).attr('stroke-width',1.5).attr('d',d=>line(d.values));
    const legend=svg.append('g').attr('transform',`translate(${width-margin.right+20},${margin.top})`);
    genres.forEach((g,i)=>{legend.append('rect').attr('x',0).attr('y',i*20).attr('width',10).attr('height',10).attr('fill',color(g));
      legend.append('text').attr('x',15).attr('y',i*20+10).text(g);
    });
    const docsBtn = document.getElementById('docs-button');
    if (docsBtn) {
      docsBtn.addEventListener('click', () => {
        window.location.href = 'docs.html';
      });
    }
  }
});
